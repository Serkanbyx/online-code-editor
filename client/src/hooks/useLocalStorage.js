import { useCallback, useEffect, useState } from 'react';

function readValue(key, initialValue) {
  if (typeof window === 'undefined') return initialValue;

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return initialValue;
    return JSON.parse(raw);
  } catch {
    return initialValue;
  }
}

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => readValue(key, initialValue));

  const setValue = useCallback(
    (valueOrUpdater) => {
      setStoredValue((previous) => {
        const nextValue =
          typeof valueOrUpdater === 'function' ? valueOrUpdater(previous) : valueOrUpdater;

        try {
          if (nextValue === undefined) {
            window.localStorage.removeItem(key);
          } else {
            window.localStorage.setItem(key, JSON.stringify(nextValue));
          }
        } catch {
          // Storage may be disabled (private mode / quota); keep in-memory state only.
        }

        return nextValue;
      });
    },
    [key],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    function handleStorage(event) {
      if (event.key !== key || event.storageArea !== window.localStorage) return;

      if (event.newValue === null) {
        setStoredValue(initialValue);
        return;
      }

      try {
        setStoredValue(JSON.parse(event.newValue));
      } catch {
        setStoredValue(initialValue);
      }
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, initialValue]);

  return [storedValue, setValue];
}

export default useLocalStorage;
