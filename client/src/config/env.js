const REQUIRED_ENV_KEYS = ['VITE_API_URL', 'VITE_SOCKET_URL', 'VITE_YJS_URL'];

function readEnv(key) {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

export function validateClientEnv() {
  if (!import.meta.env.PROD) return;

  const missing = REQUIRED_ENV_KEYS.filter((key) => !readEnv(key));

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export default validateClientEnv;
