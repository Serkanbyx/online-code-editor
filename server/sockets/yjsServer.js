import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import yWebsocketUtils from 'y-websocket/bin/utils';

import env from '../config/env.js';
import User from '../models/User.js';
import { findAccessibleRoom, isValidRoomId } from './socketUtils.js';

const { docs, setupWSConnection } = yWebsocketUtils;
const accessCacheTtlMs = 30_000;
const accessCache = new Map();
const yjsWss = new WebSocketServer({ noServer: true });

function getCacheKey(userId, docName) {
  return `${userId}:${docName}`;
}

function readCachedAccess(userId, docName) {
  const cacheKey = getCacheKey(userId, docName);
  const cachedAccess = accessCache.get(cacheKey);

  if (!cachedAccess) {
    return null;
  }

  if (cachedAccess.expiresAt <= Date.now()) {
    accessCache.delete(cacheKey);
    return null;
  }

  return cachedAccess.allowed;
}

function writeCachedAccess(userId, docName, allowed) {
  accessCache.set(getCacheKey(userId, docName), {
    allowed,
    expiresAt: Date.now() + accessCacheTtlMs,
  });
}

function clearDocAccessCache(docName) {
  for (const cacheKey of accessCache.keys()) {
    if (cacheKey.endsWith(`:${docName}`)) {
      accessCache.delete(cacheKey);
    }
  }
}

function closeUpgrade(socket, statusCode = 401, statusMessage = 'Unauthorized') {
  if (socket.writable) {
    socket.write(`HTTP/1.1 ${statusCode} ${statusMessage}\r\n\r\n`);
  }

  socket.destroy();
}

function readYjsUrl(req) {
  return new URL(req.url || '/', 'http://localhost');
}

yjsWss.on('connection', (conn, req, { docName }) => {
  setupWSConnection(conn, req, { docName, gc: true });
});

export async function verifyYjsAccess({ req, docName }) {
  if (!isValidRoomId(docName)) {
    return false;
  }

  const token = readYjsUrl(req).searchParams.get('token');

  if (!token) {
    return false;
  }

  const decoded = jwt.verify(token, env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');

  if (!user || user.isBanned) {
    return false;
  }

  const userId = user._id.toString();
  const cachedAccess = readCachedAccess(userId, docName);

  if (cachedAccess !== null) {
    return cachedAccess;
  }

  const room = await findAccessibleRoom(docName, user);
  const allowed = Boolean(room);
  writeCachedAccess(userId, docName, allowed);

  return allowed;
}

export function attachYjsToServer(httpServer, { verifyAccess = verifyYjsAccess } = {}) {
  httpServer.on('upgrade', async (req, socket, head) => {
    let url;

    try {
      url = readYjsUrl(req);
    } catch {
      return;
    }

    if (!url.pathname.startsWith('/yjs/')) {
      return;
    }

    const docName = url.pathname.replace('/yjs/', '');

    try {
      const allowed = await verifyAccess({ req, docName });

      if (!allowed) {
        closeUpgrade(socket);
        return;
      }

      yjsWss.handleUpgrade(req, socket, head, (ws) => {
        yjsWss.emit('connection', ws, req, { docName });
      });
    } catch (error) {
      console.error('Yjs WebSocket upgrade rejected:', error.message);
      closeUpgrade(socket);
    }
  });
}

export async function deleteDoc(roomId) {
  const doc = docs.get(roomId);

  clearDocAccessCache(roomId);

  if (!doc) {
    return;
  }

  for (const conn of doc.conns.keys()) {
    conn.close(1000, 'Room deleted');
  }

  doc.destroy();
  docs.delete(roomId);
}
