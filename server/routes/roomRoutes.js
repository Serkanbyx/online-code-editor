import { Router } from 'express';

import {
  addRoomParticipant,
  createRoom,
  deleteRoom,
  getMyRooms,
  getRoomById,
  joinRoom,
  leaveRoom,
  updateRoom,
} from '../controllers/roomController.js';
import { optionalAuth, protect } from '../middleware/auth.js';
import {
  validateAddParticipant,
  validateCreateRoom,
  validatePagination,
  validateRoomId,
  validateUpdateRoom,
} from '../validators/roomValidator.js';

const router = Router();

router.post('/', protect, validateCreateRoom, createRoom);
router.get('/me', protect, validatePagination, getMyRooms);
router.get('/:roomId', optionalAuth, validateRoomId, getRoomById);
router.post('/:roomId/join', protect, validateRoomId, joinRoom);
router.post('/:roomId/leave', protect, validateRoomId, leaveRoom);
router.post('/:roomId/participants', protect, validateRoomId, validateAddParticipant, addRoomParticipant);
router.patch('/:roomId', protect, validateRoomId, validateUpdateRoom, updateRoom);
router.delete('/:roomId', protect, validateRoomId, deleteRoom);

export default router;
