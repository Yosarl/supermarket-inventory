import { Router } from 'express';
import * as quotationController from '../controllers/quotationController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authenticate);

router.get('/next-invoice-no', quotationController.getNextInvoiceNo);
router.get('/search', quotationController.searchQuotation);
router.get('/', quotationController.listQuotations);
router.get('/:id', quotationController.getQuotation);
router.post(
  '/',
  validate(quotationController.createQuotationValidators),
  quotationController.createQuotation
);
router.put('/:id', quotationController.updateQuotation);
router.delete('/:id', quotationController.deleteQuotation);

export default router;
