import { Router } from 'express';

import { uploadAvatar } from '../controllers/uploadController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = Router();

router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);

export default router;
