import mongoose from 'mongoose';

import Snippet from '../models/Snippet.js';
import ApiError from '../utils/ApiError.js';
import escapeRegex from '../utils/escapeRegex.js';

const snippetNotFoundMessage = 'Snippet not found';
const listLimitDefault = 12;
const titleMaxLength = 120;
const publicSortMap = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  mostLiked: { likesCount: -1, createdAt: -1 },
  mostViewed: { views: -1, createdAt: -1 },
};

function pickDefined(source, allowedKeys) {
  return allowedKeys.reduce((result, key) => {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }

    return result;
  }, {});
}

function isOwner(snippet, user) {
  return Boolean(user && snippet.author.toString() === user._id.toString());
}

function canManageSnippet(snippet, user) {
  return isOwner(snippet, user) || user?.role === 'admin';
}

function canViewSnippet(snippet, user) {
  return snippet.isPublic || canManageSnippet(snippet, user);
}

function canForkSnippet(snippet, user) {
  return snippet.status === 'active' && (snippet.isPublic || isOwner(snippet, user));
}

function buildForkTitle(title) {
  return `Fork of ${title}`.slice(0, titleMaxLength);
}

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

function buildMySnippetsFilter(userId, visibility) {
  const filter = {
    author: userId,
    status: { $ne: 'removed' },
  };

  if (visibility === 'public') {
    filter.isPublic = true;
  }

  if (visibility === 'private') {
    filter.isPublic = false;
    filter.forkedFrom = null;
  }

  if (visibility === 'forked') {
    filter.forkedFrom = { $ne: null };
  }

  return filter;
}

function buildPublicSnippetsFilter(query) {
  const filter = {
    isPublic: true,
    status: 'active',
  };
  const searchQuery = (query.q || '').trim();

  if (searchQuery) {
    const escapedSearchQuery = escapeRegex(searchQuery);
    const searchRegex = { $regex: escapedSearchQuery, $options: 'i' };

    filter.$or = [{ title: searchRegex }, { description: searchRegex }, { tags: searchRegex }];
  }

  if (query.language) {
    filter.language = query.language;
  }

  if (query.tag) {
    filter.tags = query.tag;
  }

  return filter;
}

function hideSnippetSource(snippet) {
  const item = snippet.toJSON();
  delete item.code;
  return item;
}

async function cascadeDeleteSnippetData(snippetId) {
  const db = mongoose.connection.db;

  if (!db) {
    return;
  }

  await Promise.all([
    db.collection('comments').deleteMany({ snippet: snippetId }),
    db.collection('likes').deleteMany({ snippet: snippetId }),
  ]);
}

export async function createSnippet(req, res) {
  const snippetData = pickDefined(req.body, [
    'title',
    'description',
    'language',
    'code',
    'isPublic',
    'roomId',
    'forkedFrom',
    'tags',
  ]);

  const snippet = await Snippet.create({
    ...snippetData,
    author: req.user._id,
    status: 'active',
  });

  res.status(201).json({ snippet });
}

export async function getMySnippets(req, res) {
  const { page, limit, skip } = readPagination(req.query);
  const filter = buildMySnippetsFilter(req.user._id, req.query.visibility);

  const [items, total] = await Promise.all([
    Snippet.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-code'),
    Snippet.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    total,
  });
}

export async function getPublicSnippets(req, res) {
  const { page, limit, skip } = readPagination(req.query);
  const filter = buildPublicSnippetsFilter(req.query);
  const sort = publicSortMap[req.query.sort] || publicSortMap.newest;

  const [snippets, total] = await Promise.all([
    Snippet.find(filter).sort(sort).skip(skip).limit(limit).populate('author', 'username displayName avatarUrl'),
    Snippet.countDocuments(filter),
  ]);

  res.json({
    items: snippets.map(hideSnippetSource),
    page,
    totalPages: Math.ceil(total / limit) || 1,
    total,
  });
}

export async function getSnippetById(req, res) {
  const snippet = await Snippet.findById(req.params.id);

  if (!snippet || !canViewSnippet(snippet, req.user)) {
    throw new ApiError(404, snippetNotFoundMessage);
  }

  if (!isOwner(snippet, req.user)) {
    snippet.views += 1;
    await snippet.save();
  }

  // Populate the author projection the detail page expects (avatar + handle).
  // Skip the populate roundtrip when the field has already been hydrated.
  if (!snippet.populated('author')) {
    await snippet.populate('author', 'username displayName avatarUrl');
  }

  res.json({ snippet });
}

export async function forkSnippet(req, res) {
  const sourceSnippet = await Snippet.findById(req.params.id);

  if (!sourceSnippet || !canForkSnippet(sourceSnippet, req.user)) {
    throw new ApiError(404, snippetNotFoundMessage);
  }

  const snippet = await Snippet.create({
    title: buildForkTitle(sourceSnippet.title),
    description: sourceSnippet.description,
    language: sourceSnippet.language,
    code: sourceSnippet.code,
    tags: [...sourceSnippet.tags],
    author: req.user._id,
    isPublic: false,
    forkedFrom: sourceSnippet._id,
    status: 'active',
  });

  res.status(201).json({ snippet });
}

export async function updateSnippet(req, res) {
  const snippet = await Snippet.findById(req.params.id);

  if (!snippet || !canManageSnippet(snippet, req.user)) {
    throw new ApiError(404, snippetNotFoundMessage);
  }

  const updates = pickDefined(req.body, ['title', 'description', 'language', 'code', 'isPublic', 'tags']);
  snippet.set(updates);
  await snippet.save();

  res.json({ snippet });
}

export async function deleteSnippet(req, res) {
  const snippet = await Snippet.findById(req.params.id);

  if (!snippet || !canManageSnippet(snippet, req.user)) {
    throw new ApiError(404, snippetNotFoundMessage);
  }

  await cascadeDeleteSnippetData(snippet._id);
  await snippet.deleteOne();

  res.json({ message: 'Snippet deleted' });
}
