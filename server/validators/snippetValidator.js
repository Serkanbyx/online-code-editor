import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

import validate from '../middleware/validate.js';
import { SUPPORTED_LANGUAGES } from '../utils/constants.js';

const tagPattern = /^[a-z0-9-]+$/;
const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const publicSortOptions = ['newest', 'oldest', 'mostLiked', 'mostViewed'];

export function validateObjectId(paramName = 'id') {
  return validate([
    param(paramName).custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid resource id.');
      }

      return true;
    }),
  ]);
}

const tagValidators = [
  body('tags').optional().isArray({ max: 6 }).withMessage('Tags must be an array with at most 6 items.'),
  body('tags.*')
    .optional()
    .trim()
    .toLowerCase()
    .isLength({ min: 1, max: 24 })
    .withMessage('Each tag must be 1-24 characters.')
    .matches(tagPattern)
    .withMessage('Tags may only contain lowercase letters, numbers, and hyphens.')
    .escape(),
];

export const validateCreateSnippet = validate([
  body('title').trim().isLength({ min: 1, max: 120 }).withMessage('Title must be 1-120 characters.').escape(),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Description must be at most 500 characters.').escape(),
  body('language').optional().isIn(SUPPORTED_LANGUAGES).withMessage('Unsupported language.'),
  body('code').isString().isLength({ max: 100000 }).withMessage('Code must be at most 100,000 characters.'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean.').toBoolean(),
  body('roomId')
    .optional({ values: 'null' })
    .custom((value) => value === null || uuidV4Pattern.test(value))
    .withMessage('roomId must be a valid UUID v4 string.'),
  body('forkedFrom').optional({ values: 'null' }).isMongoId().withMessage('forkedFrom must be a valid snippet id.'),
  ...tagValidators,
]);

export const validateUpdateSnippet = validate([
  body('title').optional().trim().isLength({ min: 1, max: 120 }).withMessage('Title must be 1-120 characters.').escape(),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Description must be at most 500 characters.').escape(),
  body('language').optional().isIn(SUPPORTED_LANGUAGES).withMessage('Unsupported language.'),
  body('code').optional().isString().isLength({ max: 100000 }).withMessage('Code must be at most 100,000 characters.'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean.').toBoolean(),
  ...tagValidators,
]);

export const validatePublicQuery = validate([
  query('q').optional({ values: 'falsy' }).trim().isLength({ max: 80 }).withMessage('Search query must be at most 80 characters.').escape(),
  query('language').optional({ values: 'falsy' }).isIn(SUPPORTED_LANGUAGES).withMessage('Unsupported language.'),
  query('tag')
    .optional({ values: 'falsy' })
    .trim()
    .toLowerCase()
    .isLength({ min: 1, max: 24 })
    .withMessage('Tag must be 1-24 characters.')
    .matches(tagPattern)
    .withMessage('Tag may only contain lowercase letters, numbers, and hyphens.')
    .escape(),
  query('sort').optional({ values: 'falsy' }).isIn(publicSortOptions).withMessage('Sort must be newest, oldest, mostLiked, or mostViewed.'),
  query('page')
    .optional({ values: 'falsy' })
    .customSanitizer((value) => Math.max(Number.parseInt(value, 10) || 1, 1)),
  query('limit')
    .optional({ values: 'falsy' })
    .customSanitizer((value) => Math.min(Math.max(Number.parseInt(value, 10) || 12, 1), 50)),
]);

export const validatePagination = validate([
  query('page').optional().toInt().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional().toInt().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
  query('visibility').optional().isIn(['public', 'private', 'forked']).withMessage('Visibility must be public, private, or forked.'),
]);
