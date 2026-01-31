import { Router } from 'express';
import * as ledgerController from '../controllers/ledgerController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/report', ledgerController.getLedgerReport);
router.get('/trial-balance', ledgerController.getTrialBalance);
router.get('/trial-balance/export', ledgerController.exportTrialBalance);
router.get('/profit-loss', ledgerController.getProfitLoss);
router.get('/balance-sheet', ledgerController.getBalanceSheet);

export default router;
