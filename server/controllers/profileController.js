import Comment from '../models/Comment.js';
import Like from '../models/Like.js';
import Snippet from '../models/Snippet.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const listLimitDefault = 12;
const publicProfileFields = 'username displayName avatarUrl bio email createdAt preferences.privacy isBanned';
const publicAuthorFields = 'username displayName avatarUrl';
const snippetListFields = '-code';
const preferenceGroups = {
  privacy: ['showEmail', 'showLikedSnippets', 'showComments'],
  notifications: ['commentOnSnippet', 'snippetForked', 'productUpdates'],
};
const rootPreferenceKeys = ['theme', 'editorTheme', 'fontSize', 'tabSize', 'keymap', 'fontFamily', 'language', 'wordWrap', 'minimap', 'lineNumbers'];

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

async function findPublicProfileUser(username) {
  const user = await User.findOne({ username: username.toLowerCase(), isBanned: false }).select(publicProfileFields);

  if (!user) {
    throw new ApiError(404, 'Profile not found');
  }

  return user;
}

function isProfileOwner(profileUser, viewer) {
  return Boolean(viewer && profileUser._id.toString() === viewer._id.toString());
}

function buildPublicProfile(user) {
  const profile = {
    id: user._id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    createdAt: user.createdAt,
  };

  if (user.preferences?.privacy?.showEmail) {
    profile.email = user.email;
  }

  return profile;
}

function buildSnippetVisibilityFilter(profileUser, viewer) {
  const filter = {
    author: profileUser._id,
    status: 'active',
  };

  if (!isProfileOwner(profileUser, viewer)) {
    filter.isPublic = true;
  }

  return filter;
}

function requireVisiblePreference(profileUser, viewer, preferenceKey) {
  if (isProfileOwner(profileUser, viewer)) {
    return;
  }

  if (profileUser.preferences?.privacy?.[preferenceKey] === false) {
    throw new ApiError(403, 'Profile content is private');
  }
}

function buildAccessibleSnippetMatch(profileUser, viewer) {
  const match = { status: 'active' };

  if (!isProfileOwner(profileUser, viewer)) {
    match.isPublic = true;
  }

  return match;
}

function normalizePreferences(payload) {
  const updates = {};

  for (const key of rootPreferenceKeys) {
    if (payload[key] !== undefined) {
      updates[`preferences.${key}`] = payload[key];
    }
  }

  for (const [groupName, keys] of Object.entries(preferenceGroups)) {
    for (const key of keys) {
      if (payload[groupName]?.[key] !== undefined) {
        updates[`preferences.${groupName}.${key}`] = payload[groupName][key];
      }
    }
  }

  return updates;
}

function buildPaginationResponse(items, total, page, limit) {
  return {
    items,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    total,
  };
}

export async function getPublicProfile(req, res) {
  const user = await findPublicProfileUser(req.params.username);

  res.json({ user: buildPublicProfile(user) });
}

export async function getUserSnippets(req, res) {
  const profileUser = await findPublicProfileUser(req.params.username);
  const { page, limit, skip } = readPagination(req.query);
  const filter = buildSnippetVisibilityFilter(profileUser, req.user);

  const [snippets, total] = await Promise.all([
    Snippet.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(snippetListFields)
      .populate('author', publicAuthorFields),
    Snippet.countDocuments(filter),
  ]);

  res.json(buildPaginationResponse(snippets, total, page, limit));
}

export async function getUserLikes(req, res) {
  const profileUser = await findPublicProfileUser(req.params.username);
  requireVisiblePreference(profileUser, req.user, 'showLikedSnippets');

  const { page, limit, skip } = readPagination(req.query);
  const snippetMatch = buildAccessibleSnippetMatch(profileUser, req.user);
  const matchingSnippets = await Snippet.find(snippetMatch).select('_id');
  const filter = {
    user: profileUser._id,
    snippet: { $in: matchingSnippets.map((snippet) => snippet._id) },
  };

  const [likes, total] = await Promise.all([
    Like.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'snippet',
        select: snippetListFields,
        populate: {
          path: 'author',
          select: publicAuthorFields,
        },
      }),
    Like.countDocuments(filter),
  ]);

  res.json(buildPaginationResponse(likes, total, page, limit));
}

export async function getUserComments(req, res) {
  const profileUser = await findPublicProfileUser(req.params.username);
  requireVisiblePreference(profileUser, req.user, 'showComments');

  const { page, limit, skip } = readPagination(req.query);
  const snippetMatch = buildAccessibleSnippetMatch(profileUser, req.user);
  const matchingSnippets = await Snippet.find(snippetMatch).select('_id');
  const filter = {
    author: profileUser._id,
    status: 'active',
    snippet: { $in: matchingSnippets.map((snippet) => snippet._id) },
  };

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', publicAuthorFields)
      .populate({
        path: 'snippet',
        select: snippetListFields,
        populate: {
          path: 'author',
          select: publicAuthorFields,
        },
      }),
    Comment.countDocuments(filter),
  ]);

  res.json(buildPaginationResponse(comments, total, page, limit));
}

export async function updatePreferences(req, res) {
  const updates = normalizePreferences(req.body);
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true }).select('-password');

  res.json({ user });
}
