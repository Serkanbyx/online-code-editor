import { body } from 'express-validator';

import env from '../config/env.js';
import validate from '../middleware/validate.js';
import { SUPPORTED_LANGUAGES } from '../utils/constants.js';

const semverishPattern = /^\d+(?:\.\d+){0,3}(?:[-+][0-9A-Za-z.-]+)?$/;
const stdinMaxLength = 8 * 1024;
const codeMaxLength = env.MAX_CODE_PAYLOAD_KB * 1024;

export const validateRunCode = validate([
  body('language').isIn(SUPPORTED_LANGUAGES).withMessage('Unsupported language.'),
  body('version').optional({ values: 'falsy' }).trim().matches(semverishPattern).withMessage('Version must be a valid runtime version.'),
  body('code').isString().isLength({ min: 1, max: codeMaxLength }).withMessage(`Code must be 1-${codeMaxLength} characters.`),
  body('stdin').optional().isString().isLength({ max: stdinMaxLength }).withMessage('stdin must be at most 8 KB.'),
]);
