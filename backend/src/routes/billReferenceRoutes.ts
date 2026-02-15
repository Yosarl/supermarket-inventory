import { Router } from 'express';
import * as billReferenceController from '../controllers/billReferenceController';

const router = Router();

// GET /bill-references/outstanding?companyId=xxx&ledgerAccountId=xxx
router.get('/outstanding', billReferenceController.getOutstandingBills);

// GET /bill-references/history?companyId=xxx&ledgerAccountId=xxx
router.get('/history', billReferenceController.getBillHistory);

// POST /bill-references/settle
router.post('/settle', billReferenceController.settleBills);

export default router;
