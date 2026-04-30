import axios from 'axios';

import { dismissToast, showLoadingToast } from '../utils/helpers.js';

const DEFAULT_TIMEOUT_MS = 15000;
const COLD_START_TIMEOUT_MS = 60000;
const COLD_START_GAP_MS = 10 * 60 * 1000;
const COLD_START_TOAST_ID = 'cold-start';
const TOKEN_STORAGE_KEY = 'token';

let lastRequestAt = 0;
let coldStartToastActive = false;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT_MS,
});

function readToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage may be disabled (private mode); nothing to clean up.
  }
}

function dismissColdStartToast() {
  if (!coldStartToastActive) return;
  dismissToast(COLD_START_TOAST_ID);
  coldStartToastActive = false;
}

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  const now = Date.now();
  const elapsed = lastRequestAt ? now - lastRequestAt : 0;
  // Only raise timeout + warn when the gap is long enough to suggest a Render
  // free-tier cold start. The very first request of a session is skipped
  // (UptimeRobot from STEP 49 handles that warm-up).
  if (lastRequestAt && elapsed > COLD_START_GAP_MS) {
    config.timeout = COLD_START_TIMEOUT_MS;
    showLoadingToast('Waking up the server, this may take up to a minute...', {
      id: COLD_START_TOAST_ID,
    });
    coldStartToastActive = true;
  }
  lastRequestAt = now;

  return config;
});

api.interceptors.response.use(
  (response) => {
    dismissColdStartToast();
    return response;
  },
  (error) => {
    dismissColdStartToast();

    if (error?.response?.status === 401) {
      clearToken();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    return Promise.reject(error);
  },
);

export default api;
