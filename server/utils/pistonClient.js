import env from '../config/env.js';
import ApiError from './ApiError.js';

const runtimeCacheDurationMs = 60 * 60 * 1000;
const requestTimeoutMs = 20000;

let runtimeCache = {
  value: null,
  expiresAt: 0,
};

async function fetchJson(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(`${env.PISTON_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(502, 'Code execution service is unavailable.');
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(502, 'Code execution service is unavailable.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function getRuntimes() {
  const now = Date.now();

  if (runtimeCache.value && runtimeCache.expiresAt > now) {
    return runtimeCache.value;
  }

  const runtimes = await fetchJson('/runtimes');
  runtimeCache = {
    value: runtimes,
    expiresAt: now + runtimeCacheDurationMs,
  };

  return runtimes;
}

export async function execute({ language, version, code, stdin }) {
  return fetchJson('/execute', {
    method: 'POST',
    body: JSON.stringify({
      language,
      version,
      files: [{ content: code }],
      stdin: stdin || '',
    }),
  });
}
