import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import * as openingStockService from '../services/openingStockService';
import { validate } from '../middlewares/validate';

export const postOpeningStockValidators = [
  body('companyId').notEmpty().withMessage('Company ID is required'),
  body('financialYearId').notEmpty().withMessage('Financial year ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isFloat({ min: 0 }).withMessage('Quantity must be non-negative'),
  body('items.*.costPrice').isFloat({ min: 0 }).withMessage('Cost price must be non-negative'),
];

export async function postOpeningStock(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { companyId, financialYearId, items } = req.body;
    const userId = req.user!._id.toString();
    const result = await openingStockService.postOpeningStock(companyId, financialYearId, items, userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export const importOpeningStockValidators = [
  body('companyId').notEmpty().withMessage('Company ID is required'),
  body('financialYearId').notEmpty().withMessage('Financial year ID is required'),
  body('mapping').isObject().withMessage('Mapping is required'),
  body('mapping.quantity').isInt({ min: 0 }).withMessage('Quantity column index required'),
  body('mapping.cost').isInt({ min: 0 }).withMessage('Cost column index required'),
  body('rows').isArray().withMessage('Rows array is required'),
];

export async function importOpeningStock(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { companyId, financialYearId, mapping, rows } = req.body;
    const userId = req.user!._id.toString();
    const result = await openingStockService.importProductsAndOpeningStock(
      companyId,
      financialYearId,
      mapping,
      rows,
      userId
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
