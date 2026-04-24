import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

import validate from '../middleware/validate.js';
import { SUPPORTED_LANGUAGES } from '../utils/constants.js';

const adminRoles = ['user', 'admin'];
const moderationStatuses = ['active', 'hidden', 'removed'];
const reportActions = ['noop', 'hideTarget', 'removeTarget', 'banUser'];
const reportStatuses = ['open', 'resolved', 'dismissed'];
const reportResolutionStatuses = ['resolved', 'dismissed'];
const reportTargetTypes = ['snippet', 'comment'];

export function validateAdminUserId(paramName = 'id') {
  return validate([
    param(paramName).custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid user id.');
      }

      return true;
    }),
  ]);
}

export function validateAdminResourceId(paramName = 'id') {
  return validate([
    param(paramName).custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid resource id.');
      }

      return true;
    }),
  ]);
}

export const validateAdminUserList = validate([
  query('q').optional({ values: 'falsy' }).trim().isLength({ max: 80 }).withMessage('Search query must be at most 80 characters.').escape(),
  query('role').optional({ values: 'falsy' }).isIn(adminRoles).withMessage('Role must be user or admin.'),
  query('banned').optional({ values: 'falsy' }).isBoolean().withMessage('banned must be a boolean.').toBoolean(),
  query('page').optional({ values: 'falsy' }).toInt().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional({ values: 'falsy' }).toInt().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
]);

export const validateAdminSnippetList = validate([
  query('q').optional({ values: 'falsy' }).trim().isLength({ max: 80 }).withMessage('Search query must be at most 80 characters.').escape(),
  query('status').optional({ values: 'falsy' }).isIn(moderationStatuses).withMessage('Status must be active, hidden, or removed.'),
  query('language').optional({ values: 'falsy' }).isIn(SUPPORTED_LANGUAGES).withMessage('Unsupported language.'),
  query('page').optional({ values: 'falsy' }).toInt().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional({ values: 'falsy' }).toInt().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
]);

export const validateAdminCommentList = validate([
  query('q').optional({ values: 'falsy' }).trim().isLength({ max: 80 }).withMessage('Search query must be at most 80 characters.').escape(),
  query('status').optional({ values: 'falsy' }).isIn(moderationStatuses).withMessage('Status must be active, hidden, or removed.'),
  query('page').optional({ values: 'falsy' }).toInt().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional({ values: 'falsy' }).toInt().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
]);

export const validateAdminReportList = validate([
  query('status').optional({ values: 'falsy' }).isIn(reportStatuses).withMessage('Status must be open, resolved, or dismissed.'),
  query('targetType').optional({ values: 'falsy' }).isIn(reportTargetTypes).withMessage('targetType must be snippet or comment.'),
  query('page').optional({ values: 'falsy' }).toInt().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional({ values: 'falsy' }).toInt().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
]);

export const validateModerationStatus = validate([
  body('status').isIn(moderationStatuses).withMessage('Status must be active, hidden, or removed.'),
]);

export const validateUpdateUserRole = validate([
  body('role').isIn(adminRoles).withMessage('Role must be user or admin.'),
]);

export const validateBanUser = validate([
  body('banned').isBoolean().withMessage('banned must be a boolean.').toBoolean(),
  body('reason').optional({ values: 'falsy' }).trim().isLength({ max: 240 }).withMessage('Reason must be at most 240 characters.').escape(),
]);

export const validateResolveReport = validate([
  body('status').isIn(reportResolutionStatuses).withMessage('Status must be resolved or dismissed.'),
  body('action').isIn(reportActions).withMessage('Action must be noop, hideTarget, removeTarget, or banUser.'),
]);
