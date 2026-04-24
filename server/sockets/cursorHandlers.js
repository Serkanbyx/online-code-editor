import { isValidRoomId } from './socketUtils.js';

const cursorEventsPerSecond = 20;
const cursorBucketCapacity = 20;
const maxCursorCoordinate = 1_000_000;

function emitSocketError(socket, message) {
  socket.emit('socket:error', { message });
}

function isValidCoordinate(value) {
  return Number.isInteger(value) && value >= 1 && value <= maxCursorCoordinate;
}

function isValidPosition(position) {
  return (
    position &&
    typeof position === 'object' &&
    isValidCoordinate(position.lineNumber) &&
    isValidCoordinate(position.column)
  );
}

function isValidSelection(selection) {
  if (selection === undefined) {
    return true;
  }

  return (
    selection &&
    typeof selection === 'object' &&
    isValidCoordinate(selection.startLineNumber) &&
    isValidCoordinate(selection.startColumn) &&
    isValidCoordinate(selection.endLineNumber) &&
    isValidCoordinate(selection.endColumn)
  );
}

function createCursorThrottle() {
  let tokens = cursorBucketCapacity;
  let lastRefillAt = Date.now();

  return function consumeToken() {
    const now = Date.now();
    const elapsedSeconds = (now - lastRefillAt) / 1000;
    tokens = Math.min(cursorBucketCapacity, tokens + elapsedSeconds * cursorEventsPerSecond);
    lastRefillAt = now;

    if (tokens < 1) {
      return false;
    }

    tokens -= 1;
    return true;
  };
}

export default function registerCursorHandlers(socket) {
  const consumeCursorToken = createCursorThrottle();

  socket.on('cursor:change', (payload = {}) => {
    const { roomId, position, selection } = payload;

    if (!consumeCursorToken()) {
      return;
    }

    if (!isValidRoomId(roomId) || !isValidPosition(position) || !isValidSelection(selection)) {
      emitSocketError(socket, 'Invalid cursor payload.');
      return;
    }

    if (!socket.rooms.has(roomId)) {
      emitSocketError(socket, 'Join the room before sending cursor updates.');
      return;
    }

    socket.to(roomId).emit('cursor:update', {
      userId: socket.user._id.toString(),
      position,
      selection,
    });
  });
}
