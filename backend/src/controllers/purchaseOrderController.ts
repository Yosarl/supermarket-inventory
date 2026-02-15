import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import * as purchaseOrderService from '../services/purchaseOrderService';

export const createPurchaseOrderValidators = [
    body('companyId').notEmpty().withMessage('Company ID is required'),
    body('financialYearId').notEmpty().withMessage('Financial year ID is required'),
    body('invoiceNo').notEmpty().withMessage('Invoice number is required'),
    body('batches').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('batches.*.productId').notEmpty().withMessage('Product ID is required'),
    body('batches.*.quantity').isFloat({ min: 0.001 }).withMessage('Quantity is required'),
    body('batches.*.purchasePrice').isFloat({ min: 0 }).withMessage('Purchase price is required'),
];

export async function createPurchaseOrder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const userId = req.user!._id.toString();
        const result = await purchaseOrderService.createPurchaseOrder({
            ...req.body,
            createdBy: userId,
        });
        res.status(201).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

export async function updatePurchaseOrder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const userId = req.user!._id.toString();
        const orderId = req.params.id;
        const result = await purchaseOrderService.updatePurchaseOrder(orderId, {
            ...req.body,
            createdBy: userId,
        });
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

export async function deletePurchaseOrder(
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
        const success = await purchaseOrderService.deletePurchaseOrder(req.params.id, companyId);
        if (!success) {
            res.status(404).json({ success: false, message: 'Purchase order not found' });
            return;
        }
        res.json({ success: true, message: 'Purchase order deleted' });
    } catch (err) {
        next(err);
    }
}

export async function listPurchaseOrders(
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
        const financialYearId = req.query.financialYearId as string | undefined;
        const data = await purchaseOrderService.listPurchaseOrders(companyId, financialYearId);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
}

export async function getNextInvoiceNo(
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
        const invoiceNo = await purchaseOrderService.getNextInvoiceNo(companyId);
        res.json({ success: true, data: { invoiceNo } });
    } catch (err) {
        next(err);
    }
}

export async function getPurchaseOrderById(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const data = await purchaseOrderService.getPurchaseOrderById(req.params.id);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
}

export async function searchPurchaseOrder(
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
        const data = await purchaseOrderService.getPurchaseOrderByInvoiceNo(companyId, invoiceNo);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
}
