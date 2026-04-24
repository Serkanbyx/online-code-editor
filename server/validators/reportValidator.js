import { body, validationResult } from 'express-validator';

import ApiError from '../utils/ApiError.js';

const reportReasons = ['spam', 'abuse', 'copyright', 'inappropriate', 'other'];
const reportTargetTypes = ['snippet', 'comment'];

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

export const validateCreateReport = [
  body('targetType').isIn(reportTargetTypes).withMessage('targetType must be snippet or comment.'),
  body('targetId').isMongoId().withMessage('targetId must be a valid resource id.'),
  body('reason').isIn(reportReasons).withMessage('reason must be spam, abuse, copyright, inappropriate, or other.'),
  body('details').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Details must be at most 500 characters.').escape(),
  validateRequest,
];
