import Comment from '../models/Comment.js';
import Snippet from '../models/Snippet.js';
import ApiError from '../utils/ApiError.js';

const snippetNotFoundMessage = 'Snippet not found';
const commentNotFoundMessage = 'Comment not found';
const listLimitDefault = 12;
const deletedContent = '[deleted]';

function pickDefined(source, allowedKeys) {
  return allowedKeys.reduce((result, key) => {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }

    return result;
  }, {});
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

function isSnippetOwner(snippet, user) {
  return Boolean(user && snippet.author.toString() === user._id.toString());
}

function canViewSnippet(snippet, user) {
  if (!snippet || snippet.status !== 'active') {
    return false;
  }

  return snippet.isPublic || isSnippetOwner(snippet, user) || user?.role === 'admin';
}

function isCommentAuthor(comment, user) {
  return Boolean(user && comment.author.toString() === user._id.toString());
}

function canDeleteComment(comment, user) {
  return isCommentAuthor(comment, user) || user?.role === 'admin';
}

function normalizeParentCommentId(parentComment) {
  return parentComment || null;
}

async function findAccessibleSnippet(snippetId, user) {
  const snippet = await Snippet.findById(snippetId).select('author isPublic commentsCount status');

  if (!canViewSnippet(snippet, user)) {
    throw new ApiError(404, snippetNotFoundMessage);
  }

  return snippet;
}

async function countFirstLevelReplies(commentIds) {
  const counts = await Comment.aggregate([
    {
      $match: {
        parentComment: { $in: commentIds },
        status: 'active',
      },
    },
    {
      $group: {
        _id: '$parentComment',
        count: { $sum: 1 },
      },
    },
  ]);

  return new Map(counts.map((item) => [item._id.toString(), item.count]));
}

function attachReplyCounts(comments, replyCounts) {
  return comments.map((comment) => ({
    ...comment,
    replyCount: replyCounts.get(comment._id.toString()) || 0,
  }));
}

export async function listComments(req, res) {
  const snippet = await findAccessibleSnippet(req.params.snippetId, req.user);
  const { page, limit, skip } = readPagination(req.query);
  const filter = {
    snippet: snippet._id,
    parentComment: null,
    status: 'active',
  };

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName avatarUrl')
      .lean(),
    Comment.countDocuments(filter),
  ]);
  const replyCounts = await countFirstLevelReplies(comments.map((comment) => comment._id));

  res.json({
    items: attachReplyCounts(comments, replyCounts),
    page,
    totalPages: Math.ceil(total / limit) || 1,
    total,
  });
}

export async function listReplies(req, res) {
  const parentComment = await Comment.findById(req.params.commentId);

  if (!parentComment || parentComment.status !== 'active') {
    throw new ApiError(404, commentNotFoundMessage);
  }

  await findAccessibleSnippet(parentComment.snippet, req.user);

  const { page, limit, skip } = readPagination(req.query);
  const filter = {
    parentComment: parentComment._id,
    status: 'active',
  };

  const [items, total] = await Promise.all([
    Comment.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).populate('author', 'username displayName avatarUrl'),
    Comment.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    total,
  });
}

export async function createComment(req, res) {
  const commentData = pickDefined(req.body, ['snippet', 'content', 'parentComment']);
  commentData.parentComment = normalizeParentCommentId(commentData.parentComment);

  const snippet = await findAccessibleSnippet(commentData.snippet, req.user);

  if (commentData.parentComment) {
    const parentComment = await Comment.findById(commentData.parentComment).select('snippet status');

    if (!parentComment || parentComment.status !== 'active' || parentComment.snippet.toString() !== snippet._id.toString()) {
      throw new ApiError(400, 'Parent comment must belong to the same snippet.');
    }
  }

  const comment = await Comment.create({
    ...commentData,
    snippet: snippet._id,
    author: req.user._id,
    status: 'active',
  });
  await Snippet.findByIdAndUpdate(snippet._id, { $inc: { commentsCount: 1 } });
  await comment.populate('author', 'username displayName avatarUrl');

  res.status(201).json({ comment });
}

export async function updateComment(req, res) {
  const comment = await Comment.findById(req.params.id);

  if (!comment || comment.status !== 'active' || !isCommentAuthor(comment, req.user)) {
    throw new ApiError(404, commentNotFoundMessage);
  }

  await findAccessibleSnippet(comment.snippet, req.user);

  comment.content = req.body.content;
  await comment.save();
  await comment.populate('author', 'username displayName avatarUrl');

  res.json({ comment });
}

export async function deleteComment(req, res) {
  const comment = await Comment.findById(req.params.id);

  if (!comment || !canDeleteComment(comment, req.user)) {
    throw new ApiError(404, commentNotFoundMessage);
  }

  const wasActive = comment.status === 'active';
  comment.status = 'removed';
  comment.content = deletedContent;
  await comment.save();

  if (wasActive) {
    await Snippet.findByIdAndUpdate(comment.snippet, { $inc: { commentsCount: -1 } });
  }

  res.json({ message: 'Comment deleted' });
}
