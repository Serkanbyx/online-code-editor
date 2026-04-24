import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

function formatMongooseValidation(error) {
  return Object.values(error.errors).map((fieldError) => ({
    field: fieldError.path,
    message: fieldError.message,
  }));
}

export default function errorHandler(error, _req, res, _next) {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors;

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = formatMongooseValidation(error);
  } else if (error.code === 11000) {
    statusCode = 409;
    message = 'Resource already exists';
  } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Not authorized';
  } else if (error instanceof ApiError || error.statusCode) {
    statusCode = error.statusCode;
    message = error.message;
    errors = error.details;
  }

  const response = { message };

  if (errors) {
    response.errors = errors;
  }

  if (env.NODE_ENV !== 'production') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
}
