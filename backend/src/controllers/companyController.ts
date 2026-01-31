import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import * as companyService from '../services/companyService';
import { validate } from '../middlewares/validate';

export const createCompanyValidators = [
  body('name').trim().notEmpty().withMessage('Company name is required'),
  body('financialYearStart').isISO8601().withMessage('Valid start date required'),
  body('financialYearEnd').isISO8601().withMessage('Valid end date required'),
];

export async function createCompany(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const data = await companyService.createCompany({
      ...req.body,
      createdBy: userId,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listCompanies(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const data = await companyService.getCompaniesForUser(userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCompany(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.params.id;
    const data = await companyService.getById(companyId);
    if (!data) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
