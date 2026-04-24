import jwt from 'jsonwebtoken';

import env from '../config/env.js';
import User from '../models/User.js';

const unauthorizedError = () => new Error('Unauthorized');

export default async function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token;

    if (!token || typeof token !== 'string') {
      next(unauthorizedError());
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || user.isBanned) {
      next(unauthorizedError());
      return;
    }

    socket.user = user;
    next();
  } catch {
    next(unauthorizedError());
  }
}
