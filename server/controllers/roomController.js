import { v4 as uuidv4 } from 'uuid';

import Room from '../models/Room.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import * as yjsServer from '../sockets/yjsServer.js';

const roomNotFoundMessage = 'Room not found';
const listLimitDefault = 12;
const participantProjection = 'username displayName avatarUrl';

function pickDefined(source, allowedKeys) {
  return allowedKeys.reduce((result, key) => {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }

    return result;
  }, {});
}

function readPagination(query) {
  const page = Number.isInteger(query.page) ? query.page : Number.parseInt(query.page, 10) || 1;
  const requestedLimit = Number.isInteger(query.limit) ? query.limit : Number.parseInt(query.limit, 10) || listLimitDefault;
  const limit = Math.min(Math.max(requestedLimit, 1), 50);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function toIdString(value) {
  return value?._id ? value._id.toString() : value?.toString();
}

function isRoomOwner(room, user) {
  return Boolean(user && toIdString(room.owner) === toIdString(user._id));
}

function isRoomParticipant(room, user) {
  if (!user) {
    return false;
  }

  const userId = toIdString(user._id);
  return room.participants.some((participant) => toIdString(participant) === userId);
}

function canViewRoom(room, user) {
  return room.isPublic || isRoomOwner(room, user) || isRoomParticipant(room, user);
}

async function findRoomByRoomId(roomId) {
  return Room.findOne({ roomId });
}

async function populateRoomParticipants(room) {
  await room.populate('participants', participantProjection);
  return room;
}

export async function createRoom(req, res) {
  const roomData = pickDefined(req.body, ['name', 'language', 'isPublic']);
  const room = await Room.create({
    ...roomData,
    roomId: uuidv4(),
    owner: req.user._id,
    participants: [req.user._id],
  });

  res.status(201).json({ room });
}

export async function getMyRooms(req, res) {
  const { page, limit, skip } = readPagination(req.query);
  const filter = {
    $or: [{ owner: req.user._id }, { participants: req.user._id }],
  };

  const [items, total] = await Promise.all([
    Room.find(filter).sort({ lastActiveAt: -1 }).skip(skip).limit(limit),
    Room.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    total,
  });
}

export async function getRoomById(req, res) {
  const room = await findRoomByRoomId(req.params.roomId);

  if (!room || !canViewRoom(room, req.user)) {
    throw new ApiError(404, roomNotFoundMessage);
  }

  await populateRoomParticipants(room);
  res.json({ room });
}

export async function joinRoom(req, res) {
  const room = await findRoomByRoomId(req.params.roomId);

  if (!room) {
    throw new ApiError(404, roomNotFoundMessage);
  }

  if (!canViewRoom(room, req.user)) {
    throw new ApiError(404, roomNotFoundMessage);
  }

  if (!isRoomParticipant(room, req.user)) {
    room.participants.push(req.user._id);
  }

  room.lastActiveAt = new Date();
  await room.save();
  await populateRoomParticipants(room);

  res.json({ room });
}

export async function addRoomParticipant(req, res) {
  const room = await findRoomByRoomId(req.params.roomId);

  if (!room || !isRoomOwner(room, req.user)) {
    throw new ApiError(404, roomNotFoundMessage);
  }

  const username = req.body.username.trim().toLowerCase();
  const participant = await User.findOne({ username });

  if (!participant) {
    throw new ApiError(404, 'User not found');
  }

  if (!isRoomParticipant(room, participant)) {
    room.participants.push(participant._id);
    room.lastActiveAt = new Date();
    await room.save();
  }

  await populateRoomParticipants(room);
  res.status(201).json({ room });
}

export async function leaveRoom(req, res) {
  const room = await findRoomByRoomId(req.params.roomId);

  if (!room || !isRoomParticipant(room, req.user)) {
    throw new ApiError(404, roomNotFoundMessage);
  }

  if (isRoomOwner(room, req.user)) {
    throw new ApiError(400, 'Room owner cannot leave the room.');
  }

  const userId = toIdString(req.user._id);
  room.participants = room.participants.filter((participant) => toIdString(participant) !== userId);
  room.lastActiveAt = new Date();
  await room.save();

  res.json({ message: 'Room left' });
}

export async function updateRoom(req, res) {
  const room = await findRoomByRoomId(req.params.roomId);

  if (!room || !isRoomOwner(room, req.user)) {
    throw new ApiError(404, roomNotFoundMessage);
  }

  const updates = pickDefined(req.body, ['name', 'language', 'isPublic']);
  room.set(updates);
  await room.save();
  await populateRoomParticipants(room);

  res.json({ room });
}

export async function deleteRoom(req, res) {
  const room = await findRoomByRoomId(req.params.roomId);

  if (!room || !isRoomOwner(room, req.user)) {
    throw new ApiError(404, roomNotFoundMessage);
  }

  await yjsServer.deleteDoc(room.roomId);
  await room.deleteOne();

  res.json({ message: 'Room deleted' });
}
