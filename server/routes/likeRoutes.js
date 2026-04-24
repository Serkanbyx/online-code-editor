import { Router } from 'express';

import { getMyLikes, hasLiked, toggleLike } from '../controllers/likeController.js';
import { protect } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import { validateObjectId, validatePagination } from '../validators/snippetValidator.js';

const router = Router();

router.post('/:snippetId', protect, writeLimiter, validateObjectId('snippetId'), toggleLike);
router.get('/me', protect, validatePagination, getMyLikes);
router.get('/:snippetId/me', protect, validateObjectId('snippetId'), hasLiked);

export default router;
