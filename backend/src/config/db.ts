import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { config } from './index';

export async function connectDb(): Promise<void> {
  try {
    await mongoose.connect(config.mongodbUri);
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection error', err);
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
