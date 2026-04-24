import mongoose from 'mongoose';

import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import generateToken from '../utils/generateToken.js';

const duplicateAuthMessage = 'Email or username unavailable';
const invalidLoginMessage = 'Invalid email or password';

function buildAuthResponse(user) {
  return {
    user,
    token: generateToken(user._id),
  };
}

function pickDefined(source, allowedKeys) {
  return allowedKeys.reduce((result, key) => {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }

    return result;
  }, {});
}

async function cascadeDeleteUserData(userId) {
  const db = mongoose.connection.db;

  if (!db) {
    return;
  }

  await Promise.all([
    db.collection('snippets').deleteMany({ author: userId }),
    db.collection('comments').deleteMany({ author: userId }),
    db.collection('likes').deleteMany({ user: userId }),
    db.collection('reports').deleteMany({ reporter: userId }),
    db.collection('rooms').updateMany({ participants: userId }, { $pull: { participants: userId } }),
  ]);
}

export async function register(req, res) {
  const userData = pickDefined(req.body, ['username', 'displayName', 'email', 'password']);
  const existingUser = await User.exists({
    $or: [{ email: userData.email }, { username: userData.username }],
  });

  if (existingUser) {
    throw new ApiError(409, duplicateAuthMessage);
  }

  try {
    const user = await User.create(userData);
    res.status(201).json(buildAuthResponse(user));
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, duplicateAuthMessage);
    }

    throw error;
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user || user.isBanned) {
    throw new ApiError(401, invalidLoginMessage);
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, invalidLoginMessage);
  }

  user.lastLoginAt = new Date();
  await user.save();

  res.json(buildAuthResponse(user));
}

export function getMe(req, res) {
  res.json({ user: req.user });
}

export async function updateProfile(req, res) {
  const updates = pickDefined(req.body, ['displayName', 'bio', 'avatarUrl']);
  req.user.set(updates);
  await req.user.save();

  res.json({ user: req.user });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!user || user.isBanned) {
    throw new ApiError(401, 'Not authorized');
  }

  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Password updated' });
}

export async function deleteAccount(req, res) {
  const { password } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    throw new ApiError(401, 'Not authorized');
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid password');
  }

  await cascadeDeleteUserData(user._id);
  await user.deleteOne();

  res.json({ message: 'Account deleted' });
}
