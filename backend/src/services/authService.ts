import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { AppError } from '../middlewares/errorHandler';
import { JwtPayload } from '../middlewares/auth';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function login(
  username: string,
  password: string,
  ip?: string,
  userAgent?: string
): Promise<{ user: IUser; token: string }> {
  const user = await User.findOne({ username, status: 'active' });
  if (!user) {
    throw new AppError('Invalid username or password', 401);
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid username or password', 401);
  }
  const payload: JwtPayload = { userId: user._id.toString(), username: user.username };
  const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn as string & jwt.SignOptions['expiresIn'] });
  await AuditLog.create({
    userId: user._id,
    action: 'Login',
    entityType: 'User',
    entityId: user._id.toString(),
    ip,
    userAgent,
  });
  return { user, token };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new AppError('Current password is incorrect', 400);
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
}

export async function resetPassword(adminUserId: string, targetUserId: string, newPassword: string): Promise<void> {
  const target = await User.findById(targetUserId);
  if (!target) throw new AppError('User not found', 404);
  target.passwordHash = await hashPassword(newPassword);
  await target.save();
}
