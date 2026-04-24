import { body, validationResult } from 'express-validator';

import ApiError from '../utils/ApiError.js';

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

function validateContent() {
  return body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Content must be 1-1000 characters.')
    .escape();
}

export const validateCreateComment = [
  body('snippet').isMongoId().withMessage('snippet must be a valid snippet id.'),
  validateContent(),
  body('parentComment').optional({ values: 'null' }).isMongoId().withMessage('parentComment must be a valid comment id.'),
  validateRequest,
];

export const validateUpdateComment = [validateContent(), validateRequest];
