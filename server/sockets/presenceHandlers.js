import Room from '../models/Room.js';
import { SUPPORTED_LANGUAGES } from '../utils/constants.js';
import { findAccessibleRoom, isValidRoomId, toPublicUser } from './socketUtils.js';

const presenceByRoom = new Map();

function emitSocketError(socket, message) {
  socket.emit('socket:error', { message });
}

function getRoomPresence(roomId) {
  if (!presenceByRoom.has(roomId)) {
    presenceByRoom.set(roomId, new Map());
  }

  return presenceByRoom.get(roomId);
}

function removeSocketFromRoom(socket, roomId) {
  const roomPresence = presenceByRoom.get(roomId);

  if (!roomPresence?.has(socket.id)) {
    return false;
  }

  roomPresence.delete(socket.id);

  if (roomPresence.size === 0) {
    presenceByRoom.delete(roomId);
  }

  return true;
}

function emitUserLeft(target, roomId, userId) {
  target.to(roomId).emit('room:userLeft', {
    userId,
  });
}

function broadcastUserLeft(socket, roomId) {
  emitUserLeft(socket, roomId, socket.user._id.toString());
}

function broadcastDisconnectedUserLeft(io, socket, roomId) {
  io.to(roomId).emit('room:userLeft', {
    userId: socket.user._id.toString(),
  });
}

function isRoomOwner(room, user) {
  return Boolean(room?.owner && user?._id && room.owner.toString() === user._id.toString());
}

export default function registerPresenceHandlers(io, socket) {
  socket.on('room:join', async (payload = {}) => {
    try {
      const { roomId } = payload;

      if (!isValidRoomId(roomId)) {
        emitSocketError(socket, 'Invalid roomId.');
        return;
      }

      const room = await findAccessibleRoom(roomId, socket.user);

      if (!room) {
        emitSocketError(socket, 'Room not found or access denied.');
        return;
      }

      const user = toPublicUser(socket.user);
      const roomPresence = getRoomPresence(roomId);
      const isAlreadyPresent = roomPresence.has(socket.id);

      socket.join(roomId);
      roomPresence.set(socket.id, user);

      if (!isAlreadyPresent) {
        socket.to(roomId).emit('room:userJoined', { user });
      }

      socket.emit('room:usersInRoom', {
        users: [...roomPresence.values()],
      });
    } catch {
      emitSocketError(socket, 'Unable to join room.');
    }
  });

  socket.on('room:leave', (payload = {}) => {
    const { roomId } = payload;

    if (!isValidRoomId(roomId)) {
      emitSocketError(socket, 'Invalid roomId.');
      return;
    }

    const didLeave = removeSocketFromRoom(socket, roomId);
    socket.leave(roomId);

    if (didLeave) {
      broadcastUserLeft(socket, roomId);
    }
  });

  socket.on('room:languageChange', async (payload = {}) => {
    try {
      const { roomId, language } = payload;

      if (!isValidRoomId(roomId) || !SUPPORTED_LANGUAGES.includes(language)) {
        emitSocketError(socket, 'Invalid language change payload.');
        return;
      }

      if (!socket.rooms.has(roomId)) {
        emitSocketError(socket, 'Join the room before changing language.');
        return;
      }

      const room = await Room.findOne({ roomId }).select('owner language');

      if (!isRoomOwner(room, socket.user)) {
        emitSocketError(socket, 'Only the room owner can change language.');
        return;
      }

      io.to(roomId).emit('room:languageChange', {
        roomId,
        language,
      });
    } catch {
      emitSocketError(socket, 'Unable to broadcast language change.');
    }
  });

  socket.on('disconnecting', () => {
    for (const [roomId, roomPresence] of presenceByRoom.entries()) {
      if (roomPresence.has(socket.id)) {
        removeSocketFromRoom(socket, roomId);
        broadcastDisconnectedUserLeft(io, socket, roomId);
      }
    }
  });
}

export { presenceByRoom };
