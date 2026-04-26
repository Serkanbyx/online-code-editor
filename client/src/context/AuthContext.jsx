import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import authService from '../api/authService.js';

const TOKEN_STORAGE_KEY = 'token';
const AUTH_LOGIN_EVENT = 'auth:login';
const AUTH_LOGOUT_EVENT = 'auth:logout';

export const AuthContext = createContext(null);

function readStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage may be unavailable (private mode / quota); in-memory state still works.
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => readStoredToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(readStoredToken()));
  const hasBootstrappedRef = useRef(false);

  const clearSession = useCallback(() => {
    writeStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const persistSession = useCallback((nextToken, nextUser) => {
    writeStoredToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    window.dispatchEvent(new CustomEvent(AUTH_LOGIN_EVENT, { detail: { token: nextToken } }));
  }, []);

  // Bootstrap the session once: if a token is present, fetch the current user.
  // Strict Mode calls effects twice in dev — the ref guard keeps /auth/me idempotent.
  useEffect(() => {
    if (hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;

    const storedToken = readStoredToken();
    if (!storedToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await authService.me();
        if (cancelled) return;
        setUser(data.user ?? null);
      } catch {
        if (cancelled) return;
        // The axios 401 interceptor already clears the token and broadcasts
        // `auth:logout`; still reset local state defensively for other errors.
        clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const logout = useCallback(
    ({ redirect = true } = {}) => {
      clearSession();
      if (redirect) {
        navigate('/login', { replace: true });
      }
    },
    [clearSession, navigate],
  );

  // React to the global `auth:logout` broadcast from the axios 401 interceptor.
  useEffect(() => {
    function handleGlobalLogout() {
      clearSession();
    }

    window.addEventListener(AUTH_LOGOUT_EVENT, handleGlobalLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleGlobalLogout);
  }, [clearSession]);

  const login = useCallback(
    async (credentials) => {
      const data = await authService.login(credentials);
      persistSession(data.token, data.user);
      return data.user;
    },
    [persistSession],
  );

  const register = useCallback(
    async (payload) => {
      const data = await authService.register(payload);
      persistSession(data.token, data.user);
      return data.user;
    },
    [persistSession],
  );

  const updateUser = useCallback((partial) => {
    setUser((previous) => {
      if (!previous) return previous;
      const next = typeof partial === 'function' ? partial(previous) : { ...previous, ...partial };
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      updateUser,
    }),
    [user, token, loading, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>.');
  }

  return context;
}

export default AuthContext;
