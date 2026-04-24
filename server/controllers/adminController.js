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
const removedCommentContent = '[removed by moderator]';

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

function buildSnippetFilter(query) {
  const filter = {};
  const searchQuery = (query.q || '').trim();

  if (searchQuery) {
    const searchRegex = { $regex: escapeRegex(searchQuery), $options: 'i' };
    filter.$or = [{ title: searchRegex }, { description: searchRegex }, { tags: searchRegex }];
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.language) {
    filter.language = query.language;
  }

  return filter;
}

function buildCommentFilter(query) {
  const filter = {};
  const searchQuery = (query.q || '').trim();

  if (searchQuery) {
    filter.content = { $regex: escapeRegex(searchQuery), $options: 'i' };
  }

  if (query.status) {
    filter.status = query.status;
  }

  return filter;
}

function buildContentRestoreMessage(oldStatus, newStatus) {
  if (oldStatus === 'removed' && newStatus === 'active') {
    return 'Comment restored as active, but original content was permanently removed.';
  }

  return undefined;
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

async function deleteSnippetData(snippet) {
  await Promise.all([Comment.deleteMany({ snippet: snippet._id }), Like.deleteMany({ snippet: snippet._id })]);
}

async function reconcileCommentCount(comment, newStatus) {
  const oldStatus = comment.status;

  if (oldStatus === 'active' && newStatus !== 'active') {
    await Snippet.findByIdAndUpdate(comment.snippet, { $inc: { commentsCount: -1 } });
  } else if (oldStatus !== 'active' && newStatus === 'active') {
    await Snippet.findByIdAndUpdate(comment.snippet, { $inc: { commentsCount: 1 } });
  }
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

export async function listSnippets(req, res) {
  const { page, limit, skip } = readPagination(req.query);
  const filter = buildSnippetFilter(req.query);

  const [items, total] = await Promise.all([
    Snippet.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-code').populate('author', 'username displayName avatarUrl').lean(),
    Snippet.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    total,
  });
}

export async function moderateSnippet(req, res) {
  const snippet = await Snippet.findById(req.params.id).select('-code');

  if (!snippet) {
    throw new ApiError(404, 'Snippet not found');
  }

  snippet.status = req.body.status;
  await snippet.save();

  res.json({ snippet });
}

export async function deleteSnippetAsAdmin(req, res) {
  const snippet = await Snippet.findById(req.params.id).select('_id');

  if (!snippet) {
    throw new ApiError(404, 'Snippet not found');
  }

  await deleteSnippetData(snippet);
  await snippet.deleteOne();

  res.json({ message: 'Snippet deleted' });
}

export async function listComments(req, res) {
  const { page, limit, skip } = readPagination(req.query);
  const filter = buildCommentFilter(req.query);

  const [items, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName avatarUrl')
      .populate('snippet', 'title language status isPublic author')
      .lean(),
    Comment.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    total,
  });
}

export async function moderateComment(req, res) {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }

  const oldStatus = comment.status;
  const newStatus = req.body.status;
  const message = buildContentRestoreMessage(oldStatus, newStatus);

  await reconcileCommentCount(comment, newStatus);

  comment.status = newStatus;

  if (oldStatus !== 'removed' && newStatus === 'removed') {
    comment.content = removedCommentContent;
  }

  await comment.save();
  await comment.populate('author', 'username displayName avatarUrl');
  await comment.populate('snippet', 'title language status isPublic author');

  res.json({
    comment,
    ...(message ? { message } : {}),
  });
}
