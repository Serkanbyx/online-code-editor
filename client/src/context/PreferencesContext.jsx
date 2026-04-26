import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import profileService from '../api/profileService.js';
import { useAuth } from './AuthContext.jsx';

const GUEST_PREFS_STORAGE_KEY = 'codenest.prefs.guest';
const LOCAL_PREFS_STORAGE_KEY = 'codenest.prefs.local';

// Mirrors `preferencesSchema` on the server. Any change here must be reflected
// in `server/models/User.js` and `server/validators/profileValidator.js`.
export const DEFAULT_SERVER_PREFS = Object.freeze({
  theme: 'system',
  editorTheme: 'vs-dark',
  fontSize: 14,
  tabSize: 2,
  keymap: 'default',
  fontFamily: 'Fira Code',
  language: 'en',
  wordWrap: 'on',
  minimap: true,
  lineNumbers: 'on',
  privacy: {
    showEmail: false,
    showLikedSnippets: true,
    showComments: true,
  },
  notifications: {
    commentOnSnippet: true,
    snippetForked: true,
    productUpdates: false,
  },
});

// Client-only cosmetics that are not persisted server-side. Density,
// UI font scale and animations are purely presentational, so we keep them
// in localStorage for everyone (authenticated or guest).
export const DEFAULT_LOCAL_PREFS = Object.freeze({
  density: 'comfortable',
  uiFontSize: 'md',
  animations: true,
});

const LOCAL_PREF_KEYS = new Set(Object.keys(DEFAULT_LOCAL_PREFS));
const GROUP_PREF_KEYS = new Set(['privacy', 'notifications']);

export const PreferencesContext = createContext(null);

function readFromStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function writeToStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable — preferences still work in-memory.
  }
}

function mergeServerPrefs(incoming) {
  const source = incoming ?? {};
  return {
    ...DEFAULT_SERVER_PREFS,
    ...source,
    privacy: { ...DEFAULT_SERVER_PREFS.privacy, ...(source.privacy ?? {}) },
    notifications: { ...DEFAULT_SERVER_PREFS.notifications, ...(source.notifications ?? {}) },
  };
}

function resolvePreferredColorScheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyDocumentPreferences({ serverPrefs, localPrefs, systemScheme }) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const effectiveTheme = serverPrefs.theme === 'system' ? systemScheme : serverPrefs.theme;
  root.dataset.theme = effectiveTheme;
  root.dataset.fontsize = localPrefs.uiFontSize;
  root.dataset.density = localPrefs.density;
  root.classList.toggle('no-anim', localPrefs.animations === false);
}

export function PreferencesProvider({ children }) {
  const { user, isAuthenticated, updateUser } = useAuth();
  const [guestPrefs, setGuestPrefs] = useState(() =>
    readFromStorage(GUEST_PREFS_STORAGE_KEY, DEFAULT_SERVER_PREFS),
  );
  const [localPrefs, setLocalPrefs] = useState(() =>
    readFromStorage(LOCAL_PREFS_STORAGE_KEY, DEFAULT_LOCAL_PREFS),
  );
  const [systemScheme, setSystemScheme] = useState(() => resolvePreferredColorScheme());

  // Server-backed prefs for the authenticated user, falling back to the
  // guest copy so the UI stays themed while `/auth/me` is in flight.
  const serverPrefs = useMemo(
    () => mergeServerPrefs(isAuthenticated ? user?.preferences : guestPrefs),
    [isAuthenticated, user?.preferences, guestPrefs],
  );

  const prefs = useMemo(() => ({ ...serverPrefs, ...localPrefs }), [serverPrefs, localPrefs]);

  // Keep guest prefs in sync with localStorage so themes survive a reload.
  useEffect(() => {
    if (isAuthenticated) return;
    writeToStorage(GUEST_PREFS_STORAGE_KEY, guestPrefs);
  }, [isAuthenticated, guestPrefs]);

  useEffect(() => {
    writeToStorage(LOCAL_PREFS_STORAGE_KEY, localPrefs);
  }, [localPrefs]);

  // Track system colour-scheme changes so `theme: 'system'` reacts live.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => {
      setSystemScheme(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme/density/fontsize/animations whenever relevant prefs change.
  useEffect(() => {
    applyDocumentPreferences({ serverPrefs, localPrefs, systemScheme });
  }, [serverPrefs, localPrefs, systemScheme]);

  const pendingRevertRef = useRef(null);

  const updatePref = useCallback(
    async (key, value) => {
      if (typeof key !== 'string' || key.length === 0) return;

      const [head, tail] = key.split('.');

      if (LOCAL_PREF_KEYS.has(head)) {
        setLocalPrefs((previous) => ({ ...previous, [head]: value }));
        return;
      }

      const isGrouped = Boolean(tail) && GROUP_PREF_KEYS.has(head);
      const previousSnapshot = isAuthenticated ? user?.preferences ?? null : guestPrefs;
      const buildNext = (base) => {
        const merged = mergeServerPrefs(base);
        if (isGrouped) {
          return { ...merged, [head]: { ...merged[head], [tail]: value } };
        }
        return { ...merged, [head]: value };
      };

      if (!isAuthenticated) {
        setGuestPrefs((previous) => buildNext(previous));
        return;
      }

      const optimistic = buildNext(previousSnapshot);
      updateUser({ preferences: optimistic });

      const payload = isGrouped ? { [head]: { [tail]: value } } : { [head]: value };

      pendingRevertRef.current = previousSnapshot;
      try {
        const data = await profileService.updatePreferences(payload);
        updateUser({ preferences: mergeServerPrefs(data?.user?.preferences) });
      } catch (error) {
        updateUser({ preferences: mergeServerPrefs(previousSnapshot) });
        const message = error?.response?.data?.message ?? 'Failed to save preference.';
        toast.error(message);
      } finally {
        pendingRevertRef.current = null;
      }
    },
    [isAuthenticated, user?.preferences, guestPrefs, updateUser],
  );

  const monacoOptions = useMemo(
    () => ({
      theme: prefs.editorTheme,
      fontSize: prefs.fontSize,
      tabSize: prefs.tabSize,
      fontFamily: prefs.fontFamily,
      wordWrap: prefs.wordWrap,
      minimap: { enabled: Boolean(prefs.minimap) },
      lineNumbers: prefs.lineNumbers,
    }),
    [prefs.editorTheme, prefs.fontSize, prefs.tabSize, prefs.fontFamily, prefs.wordWrap, prefs.minimap, prefs.lineNumbers],
  );

  const value = useMemo(
    () => ({
      prefs,
      updatePref,
      monacoOptions,
      systemScheme,
    }),
    [prefs, updatePref, monacoOptions, systemScheme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error('usePreferences must be used within a <PreferencesProvider>.');
  }

  return context;
}

export default PreferencesContext;
