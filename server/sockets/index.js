import { Server } from 'socket.io';

import env from '../config/env.js';
import socketAuth from '../middleware/socketAuth.js';
import registerCursorHandlers from './cursorHandlers.js';
import registerPresenceHandlers from './presenceHandlers.js';

export function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
    path: '/socket.io',
    maxHttpBufferSize: 16 * 1024,
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    registerPresenceHandlers(io, socket);
    registerCursorHandlers(socket);
  });

  return io;
}
