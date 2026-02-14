import mongoose from 'mongoose';
import { User, IUser } from '../models/User';
import { AppError } from '../middlewares/errorHandler';
import * as authService from './authService';

export interface CreateUserInput {
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  roles: string[];
  permissions: string[];
  companyAccess: string[];
  status?: 'active' | 'locked';
  createdBy?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  email?: string;
  phone?: string;
  roles?: string[];
  permissions?: string[];
  companyAccess?: string[];
  status?: 'active' | 'locked';
  updatedBy?: string;
}

export async function listUsers(opts: { companyId?: string } = {}): Promise<IUser[]> {
  const filter: Record<string, unknown> = {};
  if (opts.companyId) filter.companyAccess = new mongoose.Types.ObjectId(opts.companyId);
  return User.find(filter)
    .select('-passwordHash')
    .sort({ username: 1 })
    .lean() as unknown as Promise<IUser[]>;
}

export async function getById(userId: string): Promise<IUser | null> {
  return User.findById(userId).select('-passwordHash').lean() as unknown as IUser | null;
}

export async function createUser(input: CreateUserInput): Promise<IUser> {
  const existing = await User.findOne({ username: input.username });
  if (existing) throw new AppError('Username already exists', 400);
  const passwordHash = await authService.hashPassword(input.password);
  const user = await User.create({
    username: input.username,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    passwordHash,
    roles: input.roles,
    permissions: input.permissions,
    companyAccess: (input.companyAccess || []).map((id) => new mongoose.Types.ObjectId(id)),
    status: input.status || 'active',
    createdBy: input.createdBy,
  });
  return user.toObject();
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<IUser> {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      ...(input.fullName != null && { fullName: input.fullName }),
      ...(input.email != null && { email: input.email }),
      ...(input.phone != null && { phone: input.phone }),
      ...(input.roles != null && { roles: input.roles }),
      ...(input.permissions != null && { permissions: input.permissions }),
      ...(input.companyAccess != null && { companyAccess: input.companyAccess.map((id) => new mongoose.Types.ObjectId(id)) }),
      ...(input.status != null && { status: input.status }),
      updatedBy: input.updatedBy,
    },
    { new: true }
  ).select('-passwordHash');
  if (!user) throw new AppError('User not found', 404);
  return user.toObject();
}

export async function resetPassword(adminUserId: string, targetUserId: string, newPassword: string): Promise<void> {
  await authService.resetPassword(adminUserId, targetUserId, newPassword);
}
