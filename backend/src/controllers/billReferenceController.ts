import { Request, Response, NextFunction } from 'express';
import * as billReferenceService from '../services/billReferenceService';

/**
 * Get outstanding bills for a specific ledger account (customer/supplier).
 * GET /bill-references/outstanding?companyId=xxx&ledgerAccountId=xxx
 */
export async function getOutstandingBills(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { companyId, ledgerAccountId } = req.query;
        if (!companyId || !ledgerAccountId) {
            return res
                .status(400)
                .json({ success: false, message: 'companyId and ledgerAccountId are required' });
        }

        const bills = await billReferenceService.getOutstandingBills(
            companyId as string,
            ledgerAccountId as string
        );

        return res.json({ success: true, data: bills });
    } catch (err) {
        next(err);
    }
}

/**
 * Get full bill history for a specific ledger account.
 * GET /bill-references/history?companyId=xxx&ledgerAccountId=xxx
 */
export async function getBillHistory(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { companyId, ledgerAccountId } = req.query;
        if (!companyId || !ledgerAccountId) {
            return res
                .status(400)
                .json({ success: false, message: 'companyId and ledgerAccountId are required' });
        }

        const history = await billReferenceService.getBillHistory(
            companyId as string,
            ledgerAccountId as string
        );

        return res.json({ success: true, data: history });
    } catch (err) {
        next(err);
    }
}

/**
 * Create "Against Reference" entries when a payment/receipt settles bills.
 * POST /bill-references/settle
 * Body: { companyId, financialYearId, voucherId, date, settlements: [{ ledgerAccountId, billNumber, amount, drCr }] }
 */
export async function settleBills(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { companyId, financialYearId, voucherId, date, settlements } = req.body;
        if (!companyId || !financialYearId || !voucherId || !settlements?.length) {
            return res
                .status(400)
                .json({ success: false, message: 'companyId, financialYearId, voucherId, and settlements are required' });
        }

        const results = [];
        for (const s of settlements) {
            const ref = await billReferenceService.createAgstRef({
                companyId,
                financialYearId,
                ledgerAccountId: s.ledgerAccountId,
                billNumber: s.billNumber,
                referenceType: 'Voucher',
                referenceId: voucherId,
                date: new Date(date),
                amount: s.amount,
                drCr: s.drCr,
                narration: s.narration || `Payment against ${s.billNumber}`,
            });
            results.push(ref);
        }

        return res.json({ success: true, data: results, message: `${results.length} bill(s) settled` });
    } catch (err) {
        next(err);
    }
}
