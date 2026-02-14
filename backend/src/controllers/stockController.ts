import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import * as stockService from '../services/stockService';

export async function getStockReport(
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
    const opts = {
      search: req.query.search as string,
      searchField: req.query.searchField as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      mode: (req.query.mode as string) || 'avg',
    };
    const data = await stockService.getStockReport(companyId, opts);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getProductStock(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.query.companyId as string;
    const productId = req.params.productId;
    if (!companyId || !productId) {
      res.status(400).json({ success: false, message: 'Company ID and Product ID required' });
      return;
    }
    const stock = await stockService.getProductStock(companyId, productId);
    res.json({ success: true, data: { stock } });
  } catch (err) {
    next(err);
  }
}
