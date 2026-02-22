import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { User } from '../models/User';
import { config } from '../config';

async function checkSeed(): Promise<void> {
  try {
    await mongoose.connect(config.mongodbUri);
  } catch (err) {
    console.error('Could not connect to MongoDB:', (err as Error).message);
    process.exit(1);
  }

  const admin = await User.findOne({ username: 'admin' });
  const userCount = await User.countDocuments();

  console.log('\n--- Database seed check ---');
  console.log('Users in DB:', userCount);
  if (admin) {
    console.log('Admin user: EXISTS (username=admin, status=' + admin.status + ')');
    console.log('Database is SEEDED. You can log in with admin / Admin@123');
  } else {
    console.log('Admin user: NOT FOUND');
    console.log('Database is NOT seeded. Run: npm run seed');
  }
  console.log('----------------------------\n');

  await mongoose.disconnect();
  process.exit(0);
}

checkSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});
