import { Router } from 'express';

import {
  createSnippet,
  deleteSnippet,
  getMySnippets,
  getSnippetById,
  updateSnippet,
} from '../controllers/snippetController.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import {
  validateCreateSnippet,
  validateObjectId,
  validatePagination,
  validateUpdateSnippet,
} from '../validators/snippetValidator.js';

const router = Router();

router.post('/', protect, validateCreateSnippet, createSnippet);
router.get('/me', protect, validatePagination, getMySnippets);
router.get('/:id', optionalAuth, validateObjectId(), getSnippetById);
router.patch('/:id', protect, validateObjectId(), validateUpdateSnippet, updateSnippet);
router.delete('/:id', protect, validateObjectId(), deleteSnippet);

export default router;
