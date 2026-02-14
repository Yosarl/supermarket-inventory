import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import * as quotationService from '../services/quotationService';

export const createQuotationValidators = [
  body('companyId').notEmpty().withMessage('Company ID is required'),
  body('financialYearId').notEmpty().withMessage('Financial year ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isFloat({ min: 0.001 }).withMessage('Quantity is required'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price is required'),
];

export async function getNextInvoiceNo(
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
    const invoiceNo = await quotationService.getNextQuotationInvoiceNo(companyId, financialYearId);
    res.json({ success: true, data: { invoiceNo } });
  } catch (err) {
    next(err);
  }
}

export async function createQuotation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const result = await quotationService.createQuotation({ ...req.body, createdBy: userId });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateQuotation(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const invoiceId = req.params.id;
    const companyId = req.body.companyId as string;
    if (!companyId) {
      res.status(400).json({ success: false, message: 'Company ID required' });
      return;
    }
    const userId = req.user!._id.toString();
    const result = await quotationService.updateQuotation(invoiceId, companyId, req.body, userId);
    if (!result) {
      res.status(404).json({ success: false, message: 'Quotation not found' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function deleteQuotation(
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
    const success = await quotationService.deleteQuotation(invoiceId, companyId);
    if (!success) {
      res.status(404).json({ success: false, message: 'Quotation not found' });
      return;
    }
    res.json({ success: true, message: 'Quotation deleted' });
  } catch (err) {
    next(err);
  }
}

export async function listQuotations(
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
    const opts = {
      search: req.query.search as string,
      fromDate: req.query.fromDate as string,
      toDate: req.query.toDate as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };
    const data = await quotationService.listQuotations(companyId, financialYearId, opts);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getQuotation(
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
    const data = await quotationService.getQuotation(invoiceId, companyId);
    if (!data) {
      res.status(404).json({ success: false, message: 'Quotation not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function searchQuotation(
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
    const data = await quotationService.searchQuotationByInvoiceNo(companyId, invoiceNo);
    if (!data) {
      res.status(404).json({ success: false, message: 'Quotation not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
