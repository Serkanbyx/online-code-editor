import { body, param, query, validationResult } from 'express-validator';

import ApiError from '../utils/ApiError.js';

const usernamePattern = /^[a-z0-9_]+$/;
const allowedRootKeys = new Set(['theme', 'editorTheme', 'fontSize', 'tabSize', 'keymap', 'fontFamily', 'language', 'wordWrap', 'minimap', 'lineNumbers']);
const allowedNestedKeys = {
  privacy: new Set(['showEmail', 'showLikedSnippets', 'showComments']),
  notifications: new Set(['commentOnSnippet', 'snippetForked', 'productUpdates']),
};

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

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertAllowedPreferencePayload(payload) {
  if (!isPlainObject(payload) || Object.keys(payload).length === 0) {
    throw new Error('Preferences payload is required.');
  }

  for (const [key, value] of Object.entries(payload)) {
    if (allowedRootKeys.has(key)) {
      continue;
    }

    if (allowedNestedKeys[key]) {
      if (!isPlainObject(value) || Object.keys(value).length === 0) {
        throw new Error(`${key} must include at least one valid preference.`);
      }

      for (const nestedKey of Object.keys(value)) {
        if (!allowedNestedKeys[key].has(nestedKey)) {
          throw new Error(`${key}.${nestedKey} is not an allowed preference.`);
        }
      }

      continue;
    }

    throw new Error(`${key} is not an allowed preference.`);
  }

  return true;
}

export const validateUsername = [
  param('username')
    .trim()
    .toLowerCase()
    .isLength({ min: 3, max: 24 })
    .withMessage('Username must be 3-24 characters.')
    .matches(usernamePattern)
    .withMessage('Username may only contain lowercase letters, numbers, and underscores.'),
  validateRequest,
];

export const validatePagination = [
  query('page').optional().toInt().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional().toInt().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
  validateRequest,
];

export const validateUpdatePreferences = [
  body().custom(assertAllowedPreferencePayload),
  body('theme').optional().isIn(['light', 'dark', 'system']).withMessage('Theme must be light, dark, or system.'),
  body('editorTheme').optional().isIn(['vs', 'vs-dark', 'hc-black', 'hc-light']).withMessage('Editor theme is not supported.'),
  body('fontSize').optional().toInt().isInt({ min: 10, max: 24 }).withMessage('Font size must be between 10 and 24.'),
  body('tabSize').optional().toInt().isIn([2, 4, 8]).withMessage('Tab size must be 2, 4, or 8.'),
  body('keymap').optional().isIn(['default', 'vim', 'emacs']).withMessage('Keymap must be default, vim, or emacs.'),
  body('fontFamily')
    .optional()
    .isIn(['Fira Code', 'JetBrains Mono', 'Source Code Pro', 'Menlo', 'Consolas'])
    .withMessage('Font family is not supported.'),
  body('language').optional().isIn(['en']).withMessage('Language is not supported.'),
  body('wordWrap').optional().isIn(['on', 'off']).withMessage('Word wrap must be on or off.'),
  body('minimap').optional().isBoolean().withMessage('Minimap must be a boolean.').toBoolean(),
  body('lineNumbers').optional().isIn(['on', 'off', 'relative']).withMessage('Line numbers must be on, off, or relative.'),
  body('privacy.showEmail').optional().isBoolean().withMessage('showEmail must be a boolean.').toBoolean(),
  body('privacy.showLikedSnippets').optional().isBoolean().withMessage('showLikedSnippets must be a boolean.').toBoolean(),
  body('privacy.showComments').optional().isBoolean().withMessage('showComments must be a boolean.').toBoolean(),
  body('notifications.commentOnSnippet').optional().isBoolean().withMessage('commentOnSnippet must be a boolean.').toBoolean(),
  body('notifications.snippetForked').optional().isBoolean().withMessage('snippetForked must be a boolean.').toBoolean(),
  body('notifications.productUpdates').optional().isBoolean().withMessage('productUpdates must be a boolean.').toBoolean(),
  validateRequest,
];
