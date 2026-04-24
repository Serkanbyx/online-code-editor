import { body } from 'express-validator';

import validate from '../middleware/validate.js';

function validateContent() {
  return body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Content must be 1-1000 characters.')
    .escape();
}

export const validateCreateComment = validate([
  body('snippet').isMongoId().withMessage('snippet must be a valid snippet id.'),
  validateContent(),
  body('parentComment').optional({ values: 'null' }).isMongoId().withMessage('parentComment must be a valid comment id.'),
]);

export const validateUpdateComment = validate([validateContent()]);
