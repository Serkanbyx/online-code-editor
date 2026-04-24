import Comment from '../models/Comment.js';
import Like from '../models/Like.js';
import Report from '../models/Report.js';
import Room from '../models/Room.js';
import Snippet from '../models/Snippet.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import escapeRegex from '../utils/escapeRegex.js';
import { getRunsLast24h } from './codeController.js';

const listLimitDefault = 12;
const safeUserFields = 'username displayName email role avatarUrl bio isBanned bannedReason lastLoginAt createdAt updatedAt';

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

function isSameUser(leftId, rightId) {
  return leftId.toString() === rightId.toString();
}

function buildUserFilter(query) {
  const filter = {};
  const searchQuery = (query.q || '').trim();

  if (searchQuery) {
    const searchRegex = { $regex: escapeRegex(searchQuery), $options: 'i' };
    filter.$or = [{ username: searchRegex }, { displayName: searchRegex }, { email: searchRegex }];
  }

  if (query.role) {
    filter.role = query.role;
  }

  if (query.banned !== undefined) {
    filter.isBanned = query.banned;
  }

  return filter;
}

async function ensureCanRemoveAdmin(user) {
  if (user.role !== 'admin') {
    return;
  }

  const remainingAdmins = await User.countDocuments({ role: 'admin', _id: { $ne: user._id } });

  if (remainingAdmins === 0) {
    throw new ApiError(409, 'Cannot remove the last admin');
  }
}

async function decrementCommentCountsForDeletedUserComments(userId, ownedSnippetIds) {
  const ownedSnippetIdStrings = new Set(ownedSnippetIds.map((snippetId) => snippetId.toString()));
  const deletedActiveComments = await Comment.aggregate([
    {
      $match: {
        author: userId,
        status: 'active',
      },
    },
    {
      $group: {
        _id: '$snippet',
        count: { $sum: 1 },
      },
    },
  ]);

  await Promise.all(
    deletedActiveComments
      .filter((item) => !ownedSnippetIdStrings.has(item._id.toString()))
      .map((item) => Snippet.findByIdAndUpdate(item._id, { $inc: { commentsCount: -item.count } }))
  );
}

async function deleteUserData(user) {
  const snippetIds = (await Snippet.find({ author: user._id }).select('_id')).map((snippet) => snippet._id);
  const commentFilter = {
    $or: [{ author: user._id }, { snippet: { $in: snippetIds } }],
  };
  const commentIds = (await Comment.find(commentFilter).select('_id')).map((comment) => comment._id);

  await decrementCommentCountsForDeletedUserComments(user._id, snippetIds);

  await Promise.all([
    Report.deleteMany({
      $or: [
        { reporter: user._id },
        { targetType: 'snippet', targetId: { $in: snippetIds } },
        { targetType: 'comment', targetId: { $in: commentIds } },
      ],
    }),
    Like.deleteMany({
      $or: [{ user: user._id }, { snippet: { $in: snippetIds } }],
    }),
    Comment.deleteMany(commentFilter),
    Snippet.deleteMany({ _id: { $in: snippetIds } }),
    Room.updateMany({ participants: user._id }, { $pull: { participants: user._id } }),
  ]);
}

export async function getDashboardStats(_req, res) {
  const signupsSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, totalSnippets, publicSnippets, totalComments, openReports, totalRooms, signupsLast7Days] = await Promise.all([
    User.countDocuments(),
    Snippet.countDocuments(),
    Snippet.countDocuments({ isPublic: true, status: 'active' }),
    Comment.countDocuments({ status: { $ne: 'removed' } }),
    Report.countDocuments({ status: 'open' }),
    Room.countDocuments(),
    User.countDocuments({ createdAt: { $gte: signupsSince } }),
  ]);

  res.json({
    stats: {
      totalUsers,
      totalSnippets,
      publicSnippets,
      totalComments,
      openReports,
      totalRooms,
      signupsLast7Days,
      runsLast24h: getRunsLast24h(),
    },
  });
}

export async function listUsers(req, res) {
  const { page, limit, skip } = readPagination(req.query);
  const filter = buildUserFilter(req.query);

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select(safeUserFields).lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    total,
  });
}

export async function getUserById(req, res) {
  const user = await User.findById(req.params.id).select(safeUserFields).lean();

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const [snippetsCount, commentsCount, likesCount] = await Promise.all([
    Snippet.countDocuments({ author: user._id }),
    Comment.countDocuments({ author: user._id }),
    Like.countDocuments({ user: user._id }),
  ]);

  res.json({
    user: {
      ...user,
      counts: {
        snippets: snippetsCount,
        comments: commentsCount,
        likes: likesCount,
      },
    },
  });
}

export async function updateUserRole(req, res) {
  const user = await User.findById(req.params.id).select(safeUserFields);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (isSameUser(user._id, req.user._id)) {
    throw new ApiError(400, 'Cannot change your own role');
  }

  if (user.role === 'admin' && req.body.role === 'user') {
    await ensureCanRemoveAdmin(user);
  }

  user.role = req.body.role;
  await user.save();

  res.json({ user });
}

export async function banUser(req, res) {
  const user = await User.findById(req.params.id).select(safeUserFields);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (isSameUser(user._id, req.user._id)) {
    throw new ApiError(400, 'Cannot ban yourself');
  }

  user.isBanned = req.body.banned;
  user.bannedReason = req.body.banned ? req.body.reason || '' : '';
  await user.save();

  res.json({ user });
}

export async function deleteUser(req, res) {
  const user = await User.findById(req.params.id).select(safeUserFields);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (isSameUser(user._id, req.user._id)) {
    throw new ApiError(400, 'Cannot delete yourself');
  }

  await ensureCanRemoveAdmin(user);
  await deleteUserData(user);
  await user.deleteOne();

  res.json({ message: 'User deleted' });
}
