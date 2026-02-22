import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import * as purchaseReturnService from '../services/purchaseReturnService';

export const createPurchaseReturnValidators = [
  body('companyId').notEmpty().withMessage('Company ID is required'),
  body('financialYearId').notEmpty().withMessage('Financial year ID is required'),
  body('date').optional().isISO8601().withMessage('Invalid date'),
  body('returnType').isIn(['OnAccount', 'ByRef']).withMessage('Return type must be OnAccount or ByRef'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isFloat({ min: 0.001 }).withMessage('Quantity is required'),
  body('items.*.purchasePrice').isFloat({ min: 0 }).withMessage('Purchase price is required'),
];

export async function createPurchaseReturn(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const result = await purchaseReturnService.createPurchaseReturn({
      ...req.body,
      createdBy: userId,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function listPurchaseReturns(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.query.companyId as string;
    const financialYearId = req.query.financialYearId as string;
    if (!companyId || !financialYearId) {
      res.status(400).json({ success: false, message: 'Company ID and Financial Year ID required' });
      return;
    }
    const data = await purchaseReturnService.listPurchaseReturns(companyId, financialYearId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getNextReturnInvoiceNo(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.query.companyId as string;
    const financialYearId = req.query.financialYearId as string;
    if (!companyId || !financialYearId) {
      res.status(400).json({ success: false, message: 'Company ID and Financial Year ID required' });
      return;
    }
    const invoiceNo = await purchaseReturnService.getNextReturnInvoiceNo(companyId, financialYearId);
    res.json({ success: true, data: { invoiceNo } });
  } catch (err) {
    next(err);
  }
}

export async function getPurchaseReturnById(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id;
    const companyId = req.query.companyId as string;
    if (!companyId) {
      res.status(400).json({ success: false, message: 'Company ID required' });
      return;
    }
    const data = await purchaseReturnService.getPurchaseReturnById(id, companyId);
    if (!data) {
      res.status(404).json({ success: false, message: 'Purchase return not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function searchPurchaseReturn(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.query.companyId as string;
    const invoiceNo = req.query.invoiceNo as string;
    if (!companyId || !invoiceNo) {
      res.status(400).json({ success: false, message: 'Company ID and Invoice No required' });
      return;
    }
    const data = await purchaseReturnService.searchPurchaseReturnByInvoiceNo(companyId, invoiceNo);
    res.json({ success: true, data: data ?? null });
  } catch (err) {
    next(err);
  }
}

export async function updatePurchaseReturn(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id;
    const companyId = (req.query.companyId as string) || req.body.companyId;
    if (!companyId) {
      res.status(400).json({ success: false, message: 'Company ID required' });
      return;
    }
    const userId = req.user!._id.toString();
    const result = await purchaseReturnService.updatePurchaseReturn(id, companyId, {
      ...req.body,
      createdBy: userId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function deletePurchaseReturn(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id;
    const companyId = req.query.companyId as string;
    if (!companyId) {
      res.status(400).json({ success: false, message: 'Company ID required' });
      return;
    }
    const deleted = await purchaseReturnService.deletePurchaseReturn(id, companyId);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Purchase return not found' });
      return;
    }
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
}
