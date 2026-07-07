import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connected');
};
