import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import * as financialYearService from '../services/financialYearService';
import { validate } from '../middlewares/validate';

export const setCurrentValidators = [
  body('financialYearId').notEmpty().withMessage('Financial year ID is required'),
];

export async function getCurrent(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.headers['x-company-id'] as string || req.query.companyId as string;
    if (!companyId) {
      res.status(400).json({ success: false, message: 'Company ID required' });
      return;
    }
    const data = await financialYearService.getCurrentForCompany(companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function setCurrent(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.headers['x-company-id'] as string || req.body.companyId;
    const { financialYearId } = req.body;
    const userId = req.user!._id.toString();
    const data = await financialYearService.setCurrent(companyId, financialYearId, userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

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
    const data = await financialYearService.listByCompany(companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export const createValidators = [
  body('companyId').notEmpty().withMessage('Company ID is required'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
];

export async function create(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { companyId, name, startDate, endDate } = req.body;
    const userId = req.user!._id.toString();
    const data = await financialYearService.create(companyId, name, new Date(startDate), new Date(endDate), userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
