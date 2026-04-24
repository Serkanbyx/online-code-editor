import { body, param, query, validationResult } from 'express-validator';

import ApiError from '../utils/ApiError.js';
import { SUPPORTED_LANGUAGES } from '../utils/constants.js';

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateRequest(req, _res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    next();
    return;
  }

  const errors = result.array().map((error) => ({
    field: error.path,
    message: error.msg,
  }));

  next(new ApiError(400, 'Validation failed', errors));
}

export const validateCreateRoom = [
  body('name').trim().isLength({ min: 1, max: 80 }).withMessage('Name must be 1-80 characters.'),
  body('language').optional().isIn(SUPPORTED_LANGUAGES).withMessage('Unsupported language.'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean.').toBoolean(),
  validateRequest,
];

export const validateUpdateRoom = [
  body('name').optional().trim().isLength({ min: 1, max: 80 }).withMessage('Name must be 1-80 characters.'),
  body('language').optional().isIn(SUPPORTED_LANGUAGES).withMessage('Unsupported language.'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean.').toBoolean(),
  validateRequest,
];

export const validateRoomId = [
  param('roomId').matches(uuidV4Pattern).withMessage('roomId must be a valid UUID v4 string.'),
  validateRequest,
];

export const validatePagination = [
  query('page').optional().toInt().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional().toInt().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
  validateRequest,
];
