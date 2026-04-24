import jwt from 'jsonwebtoken';

import env from '../config/env.js';

export default function generateToken(userId) {
  return jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}
