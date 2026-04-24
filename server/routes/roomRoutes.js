import { Router } from 'express';

import {
  createRoom,
  deleteRoom,
  getMyRooms,
  getRoomById,
  joinRoom,
  leaveRoom,
  updateRoom,
} from '../controllers/roomController.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import { validateCreateRoom, validatePagination, validateRoomId, validateUpdateRoom } from '../validators/roomValidator.js';

const router = Router();

router.post('/', protect, validateCreateRoom, createRoom);
router.get('/me', protect, validatePagination, getMyRooms);
router.get('/:roomId', optionalAuth, validateRoomId, getRoomById);
router.post('/:roomId/join', protect, validateRoomId, joinRoom);
router.post('/:roomId/leave', protect, validateRoomId, leaveRoom);
router.patch('/:roomId', protect, validateRoomId, validateUpdateRoom, updateRoom);
router.delete('/:roomId', protect, validateRoomId, deleteRoom);

export default router;
