import { Router } from 'express';

import { createReport, getMyReports } from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import { validateCreateReport } from '../validators/reportValidator.js';
import { validatePagination } from '../validators/snippetValidator.js';

const router = Router();

router.post('/', protect, writeLimiter, validateCreateReport, createReport);
router.get('/me', protect, validatePagination, getMyReports);

export default router;
