import mongoose from 'mongoose';

import { connectDB } from '../config/db.js';
import env from '../config/env.js';
import User from '../models/User.js';

function buildUsernameFromEmail(email) {
  const [localPart] = email.toLowerCase().split('@');
  const username = localPart.replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');

  if (username.length < 3) {
    return 'admin';
  }

  return username.slice(0, 24);
}

async function getAvailableUsername(email) {
  const baseUsername = buildUsernameFromEmail(email);
  let candidate = baseUsername;
  let suffix = 1;

  while (await User.exists({ username: candidate })) {
    const suffixText = `_${suffix}`;
    candidate = `${baseUsername.slice(0, 24 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  return candidate;
}

async function seedAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the admin user.');
  }

  await connectDB();

  let admin = await User.findOne({ email: env.ADMIN_EMAIL });

  if (!admin) {
    admin = await User.create({
      username: await getAvailableUsername(env.ADMIN_EMAIL),
      displayName: 'CodeNest Admin',
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      role: 'admin',
    });
  }
}

try {
  await seedAdmin();
} catch (error) {
  console.error(`Admin seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
