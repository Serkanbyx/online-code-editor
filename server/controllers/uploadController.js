import ApiError from '../utils/ApiError.js';
import { uploadBuffer } from '../utils/cloudinary.js';

export async function uploadAvatar(req, res) {
  if (!req.file) {
    throw new ApiError(400, 'Avatar file required');
  }

  const avatarUrl = await uploadBuffer(req.file.buffer, 'codenest/avatars');

  req.user.avatarUrl = avatarUrl;
  await req.user.save();

  res.json({ avatarUrl });
}
