import { useState } from 'react';
import { v4 as uuidV4 } from 'uuid';

const GUEST_ID_STORAGE_KEY = 'codenest:guestId';

function generateGuestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return uuidV4();
}

function readOrCreateGuestId() {
  if (typeof window === 'undefined') return generateGuestId();

  try {
    const existingId = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
    if (existingId) return existingId;

    const newId = generateGuestId();
    window.localStorage.setItem(GUEST_ID_STORAGE_KEY, newId);
    return newId;
  } catch {
    // Private mode or blocked storage: fall back to a per-session id so the
    // caller still gets a stable value for the lifetime of this component.
    return generateGuestId();
  }
}

export function useGuestId() {
  const [guestId] = useState(readOrCreateGuestId);
  return guestId;
}

export default useGuestId;
