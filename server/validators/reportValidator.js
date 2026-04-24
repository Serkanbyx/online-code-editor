import { body } from 'express-validator';

import validate from '../middleware/validate.js';

const reportReasons = ['spam', 'abuse', 'copyright', 'inappropriate', 'other'];
const reportTargetTypes = ['snippet', 'comment'];

export const validateCreateReport = validate([
  body('targetType').isIn(reportTargetTypes).withMessage('targetType must be snippet or comment.'),
  body('targetId').isMongoId().withMessage('targetId must be a valid resource id.'),
  body('reason').isIn(reportReasons).withMessage('reason must be spam, abuse, copyright, inappropriate, or other.'),
  body('details').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Details must be at most 500 characters.').escape(),
]);
