import { Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import * as userService from '../services/userService';
import { validate } from '../middlewares/validate';

export const createUserValidators = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('roles').isArray().withMessage('Roles must be an array'),
  body('companyAccess').optional().isArray(),
];

export async function list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.query.companyId as string | undefined;
    const data = await userService.listUsers({ companyId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.params.id;
    const data = await userService.getById(userId);
    if (!data) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const data = await userService.createUser({
      ...req.body,
      companyAccess: req.body.companyAccess || [],
      createdBy: userId,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export const updateValidators = [
  body('fullName').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('roles').optional().isArray(),
  body('permissions').optional().isArray(),
  body('companyAccess').optional().isArray(),
  body('status').optional().isIn(['active', 'locked']),
];

export async function update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetId = req.params.id;
    const userId = req.user!._id.toString();
    const data = await userService.updateUser(targetId, { ...req.body, updatedBy: userId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export const resetPasswordValidators = [
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

export async function resetPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = req.user!._id.toString();
    const targetUserId = req.params.id;
    const { newPassword } = req.body;
    await userService.resetPassword(adminUserId, targetUserId, newPassword);
    res.json({ success: true, message: 'Password reset' });
  } catch (err) {
    next(err);
  }
}
