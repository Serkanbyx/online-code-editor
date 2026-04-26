import { useCallback, useEffect, useRef, useState } from 'react';

const COPIED_RESET_MS = 2000;

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const copy = useCallback(
    async (text) => {
      const value = String(text ?? '');

      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        setCopied(false);
        return false;
      }

      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        clearTimer();
        timerRef.current = setTimeout(() => {
          setCopied(false);
          timerRef.current = null;
        }, COPIED_RESET_MS);
        return true;
      } catch {
        setCopied(false);
        return false;
      }
    },
    [clearTimer],
  );

  useEffect(() => clearTimer, [clearTimer]);

  return [copied, copy];
}

export default useCopyToClipboard;
