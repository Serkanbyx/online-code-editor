import jwt from 'jsonwebtoken';

import env from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const unauthorizedError = () => new ApiError(401, 'Not authorized');

function readBearerToken(req) {
  const authHeader = req.get('Authorization') || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

async function loadUserFromRequest(req) {
  const token = readBearerToken(req);

  if (!token) {
    throw unauthorizedError();
  }

  const decoded = jwt.verify(token, env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');

  if (!user || user.isBanned) {
    throw unauthorizedError();
  }

  return user;
}

export async function protect(req, _res, next) {
  try {
    req.user = await loadUserFromRequest(req);
    next();
  } catch (error) {
    if (error instanceof ApiError || error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(unauthorizedError());
      return;
    }

    next(error);
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    req.user = await loadUserFromRequest(req);
  } catch {
    req.user = null;
  }

  next();
}

export function adminOnly(req, _res, next) {
  if (req.user?.role !== 'admin') {
    next(new ApiError(403, 'Admin access required'));
    return;
  }

  next();
}
