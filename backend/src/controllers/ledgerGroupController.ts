import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import * as ledgerGroupService from '../services/ledgerGroupService';
import { validate } from '../middlewares/validate';

export async function list(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.query.companyId as string;
    if (!companyId) {
      res.status(400).json({ success: false, message: 'Company ID required' });
      return;
    }
    const data = await ledgerGroupService.listByCompany(companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export const createValidators = [
  body('companyId').notEmpty().withMessage('Company ID required'),
  body('name').trim().notEmpty().withMessage('Name required'),
  body('code').trim().notEmpty().withMessage('Code required'),
  body('type').isIn(['Asset', 'Liability', 'Equity', 'Income', 'Expense']).withMessage('Valid type required'),
  body('parentGroupId').optional().notEmpty(),
];

export async function create(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const data = await ledgerGroupService.create({ ...req.body, createdBy: userId });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
