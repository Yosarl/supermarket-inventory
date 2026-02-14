import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { User } from '../models/User';
import { connectDb } from '../config/db';
import * as authService from '../services/authService';

async function seed(): Promise<void> {
  await connectDb();

  const existing = await User.findOne({ username: 'admin' });
  if (existing) {
    console.log('Admin user already exists');
  } else {
    const passwordHash = await authService.hashPassword('Admin@123');
    await User.create({
      username: 'admin',
      fullName: 'Administrator',
      email: 'admin@supermarket.local',
      passwordHash,
      roles: ['Admin'],
      permissions: ['*'],
      companyAccess: [],
      status: 'active',
    });
    console.log('Created admin user: username=admin, password=Admin@123');
  }

  await mongoose.disconnect();
  console.log('Seed completed');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
