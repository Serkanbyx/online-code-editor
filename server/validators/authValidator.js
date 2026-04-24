import { body, validationResult } from 'express-validator';

import ApiError from '../utils/ApiError.js';

const usernamePattern = /^[a-z0-9_]+$/;

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

export const validateRegister = [
  body('username')
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 24 })
    .withMessage('Username must be 3-24 characters.')
    .matches(usernamePattern)
    .withMessage('Username may only contain lowercase letters, numbers, and underscores.'),
  body('displayName')
    .trim()
    .isLength({ min: 1, max: 48 })
    .withMessage('Display name must be 1-48 characters.'),
  body('email').trim().toLowerCase().isEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  validateRequest,
];

export const validateLogin = [
  body('email').trim().toLowerCase().isEmail().withMessage('Valid email is required.'),
  body('password').isString().notEmpty().withMessage('Password is required.'),
  validateRequest,
];

export const validateUpdateProfile = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 48 })
    .withMessage('Display name must be 1-48 characters.'),
  body('bio').optional().trim().isLength({ max: 240 }).withMessage('Bio must be at most 240 characters.'),
  body('avatarUrl')
    .optional({ values: 'falsy' })
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Avatar URL must be a valid HTTP or HTTPS URL.'),
  validateRequest,
];

export const validateChangePassword = [
  body('currentPassword').isString().notEmpty().withMessage('Current password is required.'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters.'),
  validateRequest,
];

export const validateDeleteAccount = [
  body('password').isString().notEmpty().withMessage('Password is required.'),
  validateRequest,
];
