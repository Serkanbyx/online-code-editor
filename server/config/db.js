import mongoose from 'mongoose';

import env from './env.js';

mongoose.set('strictQuery', true);

export async function connectDB() {
  try {
    const connection = await mongoose.connect(env.MONGO_URI);
    console.log(`Mongo connected: ${connection.connection.host}`);
  } catch (error) {
    console.error(`Mongo connection error: ${error.message}`);
    process.exit(1);
  }
}
