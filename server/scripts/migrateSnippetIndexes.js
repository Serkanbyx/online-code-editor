import mongoose from 'mongoose';

import { connectDB } from '../config/db.js';
import Snippet from '../models/Snippet.js';

function isTextIndex(index) {
  return Object.values(index.key ?? {}).includes('text');
}

async function readSnippetIndexes() {
  try {
    return await Snippet.collection.indexes();
  } catch (error) {
    if (error.code === 26 || error.codeName === 'NamespaceNotFound') {
      return [];
    }

    throw error;
  }
}

async function migrateSnippetIndexes() {
  await connectDB();

  const indexes = await readSnippetIndexes();
  const textIndexes = indexes.filter(isTextIndex);

  for (const index of textIndexes) {
    if (index.name !== 'snippet_text_search' || index.language_override === 'language') {
      await Snippet.collection.dropIndex(index.name);
    }
  }

  await Snippet.createIndexes();
}

try {
  await migrateSnippetIndexes();
} catch (error) {
  console.error(`Snippet index migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
