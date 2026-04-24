import { Router } from 'express';

import {
  createSnippet,
  deleteSnippet,
  getMySnippets,
  getPublicSnippets,
  getSnippetById,
  updateSnippet,
} from '../controllers/snippetController.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import {
  validateCreateSnippet,
  validateObjectId,
  validatePagination,
  validatePublicQuery,
  validateUpdateSnippet,
} from '../validators/snippetValidator.js';

const router = Router();

router.post('/', protect, validateCreateSnippet, createSnippet);
router.get('/me', protect, validatePagination, getMySnippets);
router.get('/public', optionalAuth, validatePublicQuery, getPublicSnippets);
router.get('/:id', optionalAuth, validateObjectId(), getSnippetById);
router.patch('/:id', protect, validateObjectId(), validateUpdateSnippet, updateSnippet);
router.delete('/:id', protect, validateObjectId(), deleteSnippet);

export default router;
