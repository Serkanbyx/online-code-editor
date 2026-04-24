import dotenv from 'dotenv';

dotenv.config();

const allowedNodeEnvs = new Set(['development', 'production', 'test']);

function parsePositiveInteger(value, fallback, key) {
  const rawValue = value ?? fallback;
  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }

  return parsedValue;
}

function readRequiredString(key) {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function readUrl(key, fallback) {
  const value = process.env[key]?.trim() || fallback;

  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`${key} must be a valid URL.`);
  }
}

const nodeEnv = process.env.NODE_ENV?.trim() || 'development';

if (!allowedNodeEnvs.has(nodeEnv)) {
  throw new Error('NODE_ENV must be one of development, production, or test.');
}

const jwtSecret = readRequiredString('JWT_SECRET');

if (nodeEnv === 'production' && jwtSecret.length < 32) {
  console.error('Fatal error: JWT_SECRET must be at least 32 characters in production.');
  process.exit(1);
}

const env = Object.freeze({
  NODE_ENV: nodeEnv,
  PORT: parsePositiveInteger(process.env.PORT, '5000', 'PORT'),
  MONGO_URI: readRequiredString('MONGO_URI'),
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN?.trim() || '7d',
  CORS_ORIGIN: (process.env.CORS_ORIGIN?.trim() || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  PISTON_BASE_URL: readUrl('PISTON_BASE_URL', 'https://emkc.org/api/v2/piston'),
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME?.trim() || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY?.trim() || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET?.trim() || '',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL?.trim() || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  MAX_CODE_PAYLOAD_KB: parsePositiveInteger(process.env.MAX_CODE_PAYLOAD_KB, '64', 'MAX_CODE_PAYLOAD_KB'),
});

export default env;
