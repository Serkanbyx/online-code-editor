import { body, param, query } from 'express-validator';

import validate from '../middleware/validate.js';
import { SUPPORTED_LANGUAGES } from '../utils/constants.js';

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const usernamePattern = /^[a-z0-9_]+$/;

export const validateCreateRoom = validate([
  body('name').trim().isLength({ min: 1, max: 80 }).withMessage('Name must be 1-80 characters.').escape(),
  body('language').optional().isIn(SUPPORTED_LANGUAGES).withMessage('Unsupported language.'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean.').toBoolean(),
]);

export const validateUpdateRoom = validate([
  body('name').optional().trim().isLength({ min: 1, max: 80 }).withMessage('Name must be 1-80 characters.').escape(),
  body('language').optional().isIn(SUPPORTED_LANGUAGES).withMessage('Unsupported language.'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean.').toBoolean(),
]);

export const validateAddParticipant = validate([
  body('username')
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 24 })
    .withMessage('Username must be 3-24 characters.')
    .matches(usernamePattern)
    .withMessage('Username may only contain lowercase letters, numbers, and underscores.'),
]);

export const validateRoomId = validate([
  param('roomId').matches(uuidV4Pattern).withMessage('roomId must be a valid UUID v4 string.'),
]);

export const validatePagination = validate([
  query('page').optional().toInt().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional().toInt().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
]);
