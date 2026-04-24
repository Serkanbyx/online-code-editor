import Room from '../models/Room.js';

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toIdString(value) {
  return value?._id ? value._id.toString() : value?.toString();
}

function isRoomParticipant(room, user) {
  const userId = toIdString(user?._id);

  if (!userId) {
    return false;
  }

  return room.participants.some((participant) => toIdString(participant) === userId);
}

function isRoomOwner(room, user) {
  return Boolean(user && toIdString(room.owner) === toIdString(user._id));
}

export function isValidRoomId(roomId) {
  return typeof roomId === 'string' && uuidV4Pattern.test(roomId);
}

export function toPublicUser(user) {
  return {
    userId: toIdString(user._id),
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

export async function findAccessibleRoom(roomId, user) {
  if (!isValidRoomId(roomId)) {
    return null;
  }

  const room = await Room.findOne({ roomId }).select('roomId owner isPublic participants');

  if (!room || (!room.isPublic && !isRoomOwner(room, user) && !isRoomParticipant(room, user))) {
    return null;
  }

  return room;
}
