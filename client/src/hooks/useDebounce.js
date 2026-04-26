import { useEffect, useState } from 'react';

const DEFAULT_DELAY_MS = 300;

export function useDebounce(value, delayMs = DEFAULT_DELAY_MS) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timerId);
  }, [value, delayMs]);

  return debouncedValue;
}

export default useDebounce;
