import multer from 'multer';

import ApiError from '../utils/ApiError.js';

const avatarMaxSize = 2 * 1024 * 1024;
const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function imageFileFilter(_req, file, callback) {
  if (!allowedImageMimeTypes.has(file.mimetype)) {
    callback(new ApiError(400, 'Only JPEG, PNG, and WebP images are allowed'));
    return;
  }

  callback(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: avatarMaxSize,
  },
  fileFilter: imageFileFilter,
});

export default upload;
