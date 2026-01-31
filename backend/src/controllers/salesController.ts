import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import * as salesService from '../services/salesService';
import { validate } from '../middlewares/validate';

export const createPOSValidators = [
  body('companyId').notEmpty().withMessage('Company ID is required'),
  body('financialYearId').notEmpty().withMessage('Financial year ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isFloat({ min: 0.001 }).withMessage('Quantity is required'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price is required'),
  body('paymentDetails').isArray({ min: 1 }).withMessage('At least one payment is required'),
  body('paymentDetails.*.mode').notEmpty().withMessage('Payment mode is required'),
  body('paymentDetails.*.amount').isFloat({ min: 0 }).withMessage('Payment amount is required'),
];

export async function createPOSSale(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const result = await salesService.createPOSSale({ ...req.body, createdBy: userId });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getInvoice(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const invoiceId = req.params.id;
    const companyId = req.query.companyId as string;
    if (!companyId) {
      res.status(400).json({ success: false, message: 'Company ID required' });
      return;
    }
    const data = await salesService.getInvoice(invoiceId, companyId);
    if (!data) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
