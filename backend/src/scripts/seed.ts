import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { config } from '../config';
import { User } from '../models/User';
import { connectDb } from '../config/db';
import * as authService from '../services/authService';
import * as companyService from '../services/companyService';

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

  const admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    console.log('No admin user to attach company to');
    await mongoose.disconnect();
    process.exit(0);
    return;
  }

  const companyCount = await mongoose.connection.db?.collection('companies').countDocuments();
  if (companyCount === 0) {
    const start = new Date();
    start.setMonth(0);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(0);

    const company = await companyService.createCompany({
      name: 'Demo Supermarket',
      legalName: 'Demo Supermarket LLC',
      address: 'Dubai, UAE',
      TRN: '100000000000003',
      defaultCurrency: 'AED',
      vatConfig: { standardRate: 5 },
      financialYearName: `FY ${start.getFullYear()}`,
      financialYearStart: start,
      financialYearEnd: end,
      createdBy: admin._id.toString(),
    });

    admin.companyAccess.push(company._id as mongoose.Types.ObjectId);
    await admin.save();
    console.log('Created demo company: Demo Supermarket');
  }

  await mongoose.disconnect();
  console.log('Seed completed');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
