import { Router } from 'express';

import {
  banUser,
  deleteSnippetAsAdmin,
  deleteUser,
  getDashboardStats,
  getUserById,
  listComments,
  listReports,
  listSnippets,
  listUsers,
  moderateComment,
  moderateSnippet,
  resolveReport,
  updateUserRole,
} from '../controllers/adminController.js';
import { adminOnly, protect } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiters.js';
import {
  validateAdminCommentList,
  validateAdminReportList,
  validateAdminResourceId,
  validateAdminSnippetList,
  validateAdminUserId,
  validateAdminUserList,
  validateBanUser,
  validateModerationStatus,
  validateResolveReport,
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
router.get('/snippets', validateAdminSnippetList, listSnippets);
router.patch('/snippets/:id/status', validateAdminResourceId(), validateModerationStatus, moderateSnippet);
router.delete('/snippets/:id', validateAdminResourceId(), deleteSnippetAsAdmin);
router.get('/comments', validateAdminCommentList, listComments);
router.patch('/comments/:id/status', validateAdminResourceId(), validateModerationStatus, moderateComment);
router.get('/reports', validateAdminReportList, listReports);
router.patch('/reports/:id', validateAdminResourceId(), validateResolveReport, resolveReport);

export default router;
