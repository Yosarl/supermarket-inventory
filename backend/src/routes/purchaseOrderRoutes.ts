import { Router } from 'express';
import * as purchaseOrderController from '../controllers/purchaseOrderController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authenticate);

router.get('/', purchaseOrderController.listPurchaseOrders);
router.get('/next-invoice-no', purchaseOrderController.getNextInvoiceNo);
router.get('/search', purchaseOrderController.searchPurchaseOrder);
router.get('/:id', purchaseOrderController.getPurchaseOrderById);

router.post(
    '/',
    validate(purchaseOrderController.createPurchaseOrderValidators),
    purchaseOrderController.createPurchaseOrder
);

router.put(
    '/:id',
    validate(purchaseOrderController.createPurchaseOrderValidators),
    purchaseOrderController.updatePurchaseOrder
);

router.delete('/:id', purchaseOrderController.deletePurchaseOrder);

export default router;
