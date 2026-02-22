import { Router } from 'express';
import * as purchaseReturnController from '../controllers/purchaseReturnController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authenticate);

router.get('/', purchaseReturnController.listPurchaseReturns);
router.get('/next-invoice-no', purchaseReturnController.getNextReturnInvoiceNo);
router.get('/search', purchaseReturnController.searchPurchaseReturn);
router.get('/:id', purchaseReturnController.getPurchaseReturnById);
router.post(
  '/',
  validate(purchaseReturnController.createPurchaseReturnValidators),
  purchaseReturnController.createPurchaseReturn
);
router.put(
  '/:id',
  validate(purchaseReturnController.createPurchaseReturnValidators),
  purchaseReturnController.updatePurchaseReturn
);
router.delete('/:id', purchaseReturnController.deletePurchaseReturn);

export default router;
