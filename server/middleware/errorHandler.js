import env from '../config/env.js';

export default function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    message: error.message || 'Internal server error',
    stack: env.NODE_ENV === 'production' ? undefined : error.stack,
  });
}
