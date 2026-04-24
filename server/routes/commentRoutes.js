import { Router } from 'express';

import { createComment, deleteComment, listComments, listReplies, updateComment } from '../controllers/commentController.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import { validateCreateComment, validateUpdateComment } from '../validators/commentValidator.js';
import { validateObjectId, validatePagination } from '../validators/snippetValidator.js';

const router = Router();

router.get('/snippet/:snippetId', optionalAuth, validateObjectId('snippetId'), validatePagination, listComments);
router.get('/:commentId/replies', optionalAuth, validateObjectId('commentId'), validatePagination, listReplies);
router.post('/', protect, writeLimiter, validateCreateComment, createComment);
router.patch('/:id', protect, validateObjectId(), validateUpdateComment, updateComment);
router.delete('/:id', protect, validateObjectId(), deleteComment);

export default router;
