import rateLimit from 'express-rate-limit';

const commonOptions = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

export const globalLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 300,
});

export const authLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 10,
});

export const adminLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 60,
});

export const codeRunLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000,
  max: 8,
});

export const writeLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000,
  max: 30,
});
