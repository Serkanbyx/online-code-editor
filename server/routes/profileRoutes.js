import { Router } from 'express';

import {
  getPublicProfile,
  getUserComments,
  getUserLikes,
  getUserSnippets,
  updatePreferences,
} from '../controllers/profileController.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import { validatePagination, validateUpdatePreferences, validateUsername } from '../validators/profileValidator.js';

const router = Router();

router.patch('/me/preferences', protect, validateUpdatePreferences, updatePreferences);
router.get('/:username', optionalAuth, validateUsername, getPublicProfile);
router.get('/:username/snippets', optionalAuth, validateUsername, validatePagination, getUserSnippets);
router.get('/:username/likes', optionalAuth, validateUsername, validatePagination, getUserLikes);
router.get('/:username/comments', optionalAuth, validateUsername, validatePagination, getUserComments);

export default router;
