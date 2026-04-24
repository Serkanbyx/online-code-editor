import { Router } from 'express';

import { getRuntimes, runCode } from '../controllers/codeController.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import { codeRunLimiter } from '../middleware/rateLimiters.js';
import { validateRunCode } from '../validators/codeValidator.js';

const router = Router();

router.get('/runtimes', optionalAuth, getRuntimes);
router.post('/run', protect, codeRunLimiter, validateRunCode, runCode);

export default router;
