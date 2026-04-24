import { Router } from 'express';

import {
  changePassword,
  deleteAccount,
  getMe,
  login,
  register,
  updateProfile,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import {
  validateChangePassword,
  validateDeleteAccount,
  validateLogin,
  validateRegister,
  validateUpdateProfile,
} from '../validators/authValidator.js';

const router = Router();

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.get('/me', protect, getMe);
router.patch('/me', protect, validateUpdateProfile, updateProfile);
router.patch('/password', protect, validateChangePassword, changePassword);
router.delete('/me', protect, validateDeleteAccount, deleteAccount);

export default router;
