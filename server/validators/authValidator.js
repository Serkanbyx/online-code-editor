import { body } from 'express-validator';

import validate from '../middleware/validate.js';

const usernamePattern = /^[a-z0-9_]+$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).+$/;

function passwordRule(field, label = 'Password') {
  return body(field)
    .isLength({ min: 8 })
    .withMessage(`${label} must be at least 8 characters.`)
    .matches(passwordPattern)
    .withMessage(`${label} must include at least one letter and one number.`);
}

export const validateRegister = validate([
  body('username')
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 24 })
    .withMessage('Username must be 3-24 characters.')
    .matches(usernamePattern)
    .withMessage('Username may only contain lowercase letters, numbers, and underscores.')
    .escape(),
  body('displayName')
    .trim()
    .isLength({ min: 1, max: 48 })
    .withMessage('Display name must be 1-48 characters.')
    .escape(),
  body('email').trim().toLowerCase().isEmail().withMessage('Valid email is required.'),
  passwordRule('password'),
]);

export const validateLogin = validate([
  body('email').trim().toLowerCase().isEmail().withMessage('Valid email is required.'),
  body('password').isString().notEmpty().withMessage('Password is required.'),
]);

export const validateUpdateProfile = validate([
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 48 })
    .withMessage('Display name must be 1-48 characters.')
    .escape(),
  body('bio').optional().trim().isLength({ max: 240 }).withMessage('Bio must be at most 240 characters.').escape(),
  body('avatarUrl')
    .optional({ values: 'falsy' })
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Avatar URL must be a valid HTTP or HTTPS URL.'),
]);

export const validateChangePassword = validate([
  body('currentPassword').isString().notEmpty().withMessage('Current password is required.'),
  passwordRule('newPassword', 'New password'),
]);

export const validateDeleteAccount = validate([
  body('password').isString().notEmpty().withMessage('Password is required.'),
]);
