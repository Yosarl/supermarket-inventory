import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import * as authService from '../services/authService';
import { validate } from '../middlewares/validate';

export const loginValidators = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export async function login(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { username, password } = req.body;
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.get('User-Agent');
    const result = await authService.login(username, password, ip, userAgent);
    const user = result.user as { _id: unknown; username: string; fullName: string; email?: string; phone?: string; roles: string[]; permissions: string[]; companyAccess: unknown[]; status: string };
    res.json({
      success: true,
      data: {
        token: result.token,
        user: {
          _id: user._id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          roles: user.roles ?? [],
          permissions: user.permissions ?? [],
          companyAccess: user.companyAccess ?? [],
          status: user.status,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export const changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

export async function changePassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(userId, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed' });
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const data = {
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
      permissions: user.permissions,
      companyAccess: user.companyAccess,
      status: user.status,
    };
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
