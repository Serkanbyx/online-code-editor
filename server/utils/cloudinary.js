import { v2 as cloudinary } from 'cloudinary';

import env from '../config/env.js';
import ApiError from './ApiError.js';

const requiredCloudinaryKeys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

function ensureCloudinaryConfigured() {
  const missingKeys = requiredCloudinaryKeys.filter((key) => !env[key]);

  if (missingKeys.length > 0) {
    throw new ApiError(503, 'Avatar upload service is not configured');
  }
}

export function uploadBuffer(buffer, folder) {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(new ApiError(503, 'Avatar upload service is unavailable'));
          return;
        }

        if (!result?.secure_url) {
          reject(new ApiError(503, 'Avatar upload service did not return a URL'));
          return;
        }

        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}
