import Comment from '../models/Comment.js';
import Report from '../models/Report.js';
import Snippet from '../models/Snippet.js';
import ApiError from '../utils/ApiError.js';

const targetModels = {
  snippet: Snippet,
  comment: Comment,
};

const listLimitDefault = 12;

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

async function ensureTargetExists(targetType, targetId) {
  const TargetModel = targetModels[targetType];

  if (!TargetModel) {
    throw new ApiError(400, 'Invalid report target type');
  }

  const target = await TargetModel.findById(targetId).select('_id');

  if (!target) {
    throw new ApiError(404, 'Report target not found');
  }
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

export async function createReport(req, res) {
  const reportData = pickDefined(req.body, ['targetType', 'targetId', 'reason', 'details']);

  await ensureTargetExists(reportData.targetType, reportData.targetId);

  const existingReport = await Report.findOne({
    targetType: reportData.targetType,
    targetId: reportData.targetId,
    reporter: req.user._id,
  });

  if (existingReport) {
    res.json({ message: 'Already reported', report: existingReport });
    return;
  }

  try {
    const report = await Report.create({
      ...reportData,
      reporter: req.user._id,
    });

    res.status(201).json({ report });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const report = await Report.findOne({
        targetType: reportData.targetType,
        targetId: reportData.targetId,
        reporter: req.user._id,
      });

      res.json({ message: 'Already reported', report });
      return;
    }

    throw error;
  }
}

export async function getMyReports(req, res) {
  const { page, limit, skip } = readPagination(req.query);
  const filter = { reporter: req.user._id };

  const [items, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Report.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    total,
  });
}
