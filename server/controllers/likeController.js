import Like from '../models/Like.js';
import Snippet from '../models/Snippet.js';
import ApiError from '../utils/ApiError.js';

const snippetNotFoundMessage = 'Snippet not found';
const listLimitDefault = 12;

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

function canViewSnippet(snippet, user) {
  if (!snippet || snippet.status !== 'active') {
    return false;
  }

  return snippet.isPublic || snippet.author.toString() === user._id.toString() || user.role === 'admin';
}

function isDuplicateLikeError(error) {
  return error?.code === 11000;
}

async function findAccessibleSnippet(snippetId, user) {
  const snippet = await Snippet.findById(snippetId).select('author isPublic likesCount status');

  if (!canViewSnippet(snippet, user)) {
    throw new ApiError(404, snippetNotFoundMessage);
  }

  return snippet;
}

async function readLikesCount(snippetId) {
  const snippet = await Snippet.findById(snippetId).select('likesCount');
  return snippet?.likesCount ?? 0;
}

export async function toggleLike(req, res) {
  const snippet = await findAccessibleSnippet(req.params.snippetId, req.user);
  const likeFilter = {
    user: req.user._id,
    snippet: snippet._id,
  };

  const deletedLike = await Like.findOneAndDelete(likeFilter);

  if (deletedLike) {
    const updatedSnippet = await Snippet.findByIdAndUpdate(snippet._id, { $inc: { likesCount: -1 } }, { new: true }).select('likesCount');

    res.json({
      liked: false,
      likesCount: updatedSnippet?.likesCount ?? Math.max(snippet.likesCount - 1, 0),
    });
    return;
  }

  try {
    await Like.create(likeFilter);
  } catch (error) {
    if (!isDuplicateLikeError(error)) {
      throw error;
    }

    res.json({
      liked: true,
      likesCount: await readLikesCount(snippet._id),
    });
    return;
  }

  const updatedSnippet = await Snippet.findByIdAndUpdate(snippet._id, { $inc: { likesCount: 1 } }, { new: true }).select('likesCount');

  res.json({
    liked: true,
    likesCount: updatedSnippet?.likesCount ?? snippet.likesCount + 1,
  });
}

export async function getMyLikes(req, res) {
  const { page, limit, skip } = readPagination(req.query);
  const filter = { user: req.user._id };

  const [likes, total] = await Promise.all([
    Like.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'snippet',
        match: { status: 'active' },
        select: '-code',
        populate: {
          path: 'author',
          select: 'username displayName avatarUrl',
        },
      }),
    Like.countDocuments(filter),
  ]);

  res.json({
    items: likes.filter((like) => like.snippet),
    page,
    totalPages: Math.ceil(total / limit) || 1,
    total,
  });
}

export async function hasLiked(req, res) {
  const snippet = await findAccessibleSnippet(req.params.snippetId, req.user);
  const liked = await Like.exists({
    user: req.user._id,
    snippet: snippet._id,
  });

  res.json({ liked: Boolean(liked) });
}
