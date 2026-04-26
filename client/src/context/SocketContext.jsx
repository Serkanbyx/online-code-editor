import { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { useAuth } from './AuthContext.jsx';

const TOKEN_STORAGE_KEY = 'token';
const AUTH_LOGIN_EVENT = 'auth:login';
const AUTH_LOGOUT_EVENT = 'auth:logout';

export const SocketContext = createContext(null);

function readStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function resolveSocketUrl() {
  const url = import.meta.env.VITE_SOCKET_URL;
  return typeof url === 'string' && url.length > 0 ? url : undefined;
}

export function SocketProvider({ children }) {
  const { isAuthenticated, token } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Create the socket lazily on first authentication; reuse the same
  // instance across renders. A ref guard keeps Strict Mode from making two.
  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return undefined;
    }

    if (!socketRef.current) {
      socketRef.current = io(resolveSocketUrl(), {
        auth: { token: token ?? readStoredToken() },
        autoConnect: false,
        transports: ['websocket'],
        withCredentials: true,
      });

      socketRef.current.on('connect', () => setConnected(true));
      socketRef.current.on('disconnect', () => setConnected(false));
      socketRef.current.on('connect_error', () => setConnected(false));
    } else {
      socketRef.current.auth = { token: token ?? readStoredToken() };
    }

    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }

    return undefined;
  }, [isAuthenticated, token]);

  // Refresh the auth payload on re-login and tear the socket down on logout.
  useEffect(() => {
    function handleLogin(event) {
      const socket = socketRef.current;
      if (!socket) return;
      const nextToken = event?.detail?.token ?? readStoredToken();
      socket.auth = { token: nextToken };
      if (!socket.connected) {
        socket.connect();
      }
    }

    function handleLogout() {
      const socket = socketRef.current;
      if (!socket) return;
      socket.disconnect();
      setConnected(false);
    }

    window.addEventListener(AUTH_LOGIN_EVENT, handleLogin);
    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout);
    return () => {
      window.removeEventListener(AUTH_LOGIN_EVENT, handleLogin);
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const value = useMemo(
    () => ({ socket: socketRef.current, connected }),
    // socketRef.current is stable post-init; `connected` drives re-renders for consumers.
    [connected],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export default SocketContext;
