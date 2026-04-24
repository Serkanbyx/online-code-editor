import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';

import ApiError from '../utils/ApiError.js';
import { SUPPORTED_LANGUAGES } from '../utils/constants.js';

const adminRoles = ['user', 'admin'];
const moderationStatuses = ['active', 'hidden', 'removed'];

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

export function validateAdminUserId(paramName = 'id') {
  return [
    param(paramName).custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid user id.');
      }

      return true;
    }),
    validateRequest,
  ];
}

export function validateAdminResourceId(paramName = 'id') {
  return [
    param(paramName).custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid resource id.');
      }

      return true;
    }),
    validateRequest,
  ];
}

export const validateAdminUserList = [
  query('q').optional({ values: 'falsy' }).trim().isLength({ max: 80 }).withMessage('Search query must be at most 80 characters.').escape(),
  query('role').optional({ values: 'falsy' }).isIn(adminRoles).withMessage('Role must be user or admin.'),
  query('banned').optional({ values: 'falsy' }).isBoolean().withMessage('banned must be a boolean.').toBoolean(),
  query('page').optional({ values: 'falsy' }).toInt().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional({ values: 'falsy' }).toInt().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
  validateRequest,
];

export const validateAdminSnippetList = [
  query('q').optional({ values: 'falsy' }).trim().isLength({ max: 80 }).withMessage('Search query must be at most 80 characters.').escape(),
  query('status').optional({ values: 'falsy' }).isIn(moderationStatuses).withMessage('Status must be active, hidden, or removed.'),
  query('language').optional({ values: 'falsy' }).isIn(SUPPORTED_LANGUAGES).withMessage('Unsupported language.'),
  query('page').optional({ values: 'falsy' }).toInt().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional({ values: 'falsy' }).toInt().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
  validateRequest,
];

export const validateAdminCommentList = [
  query('q').optional({ values: 'falsy' }).trim().isLength({ max: 80 }).withMessage('Search query must be at most 80 characters.').escape(),
  query('status').optional({ values: 'falsy' }).isIn(moderationStatuses).withMessage('Status must be active, hidden, or removed.'),
  query('page').optional({ values: 'falsy' }).toInt().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional({ values: 'falsy' }).toInt().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
  validateRequest,
];

export const validateModerationStatus = [
  body('status').isIn(moderationStatuses).withMessage('Status must be active, hidden, or removed.'),
  validateRequest,
];

export const validateUpdateUserRole = [
  body('role').isIn(adminRoles).withMessage('Role must be user or admin.'),
  validateRequest,
];

export const validateBanUser = [
  body('banned').isBoolean().withMessage('banned must be a boolean.').toBoolean(),
  body('reason').optional({ values: 'falsy' }).trim().isLength({ max: 240 }).withMessage('Reason must be at most 240 characters.').escape(),
  validateRequest,
];
