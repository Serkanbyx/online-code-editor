import { Router } from 'express';

import {
  banUser,
  deleteUser,
  getDashboardStats,
  getUserById,
  listUsers,
  updateUserRole,
} from '../controllers/adminController.js';
import { adminOnly, protect } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiters.js';
import {
  validateAdminUserId,
  validateAdminUserList,
  validateBanUser,
  validateUpdateUserRole,
} from '../validators/adminValidator.js';

const router = Router();

router.use(protect, adminOnly, adminLimiter);

router.get('/stats', getDashboardStats);
router.get('/users', validateAdminUserList, listUsers);
router.get('/users/:id', validateAdminUserId(), getUserById);
router.patch('/users/:id/role', validateAdminUserId(), validateUpdateUserRole, updateUserRole);
router.patch('/users/:id/ban', validateAdminUserId(), validateBanUser, banUser);
router.delete('/users/:id', validateAdminUserId(), deleteUser);

export default router;
