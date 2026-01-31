import { Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import * as productService from '../services/productService';
import { validate } from '../middlewares/validate';

export const createProductValidators = [
  body('companyId').notEmpty().withMessage('Company ID is required'),
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('unitOfMeasureId').notEmpty().withMessage('Unit of measure is required'),
];

export async function createProduct(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!._id.toString();
    const data = await productService.createProduct({ ...req.body, createdBy: userId });
    res.status(201).json({ success: true, data });
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
    const search = req.query.search as string | undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const result = await productService.list(companyId, { search, categoryId, page, limit });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getByBarcode(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.query.companyId as string;
    const barcode = req.query.barcode as string;
    if (!companyId || !barcode) {
      res.status(400).json({ success: false, message: 'Company ID and barcode required' });
      return;
    }
    const data = await productService.findByBarcode(companyId, barcode);
    if (!data) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getById(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const productId = req.params.id;
    const companyId = req.query.companyId as string;
    if (!companyId) {
      res.status(400).json({ success: false, message: 'Company ID required' });
      return;
    }
    const data = await productService.getById(productId, companyId);
    if (!data) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getUnits(
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
    const data = await productService.getUnitOfMeasures(companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
