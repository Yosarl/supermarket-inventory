import { Router } from 'express';
import * as salesController from '../controllers/salesController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authenticate);

router.post(
  '/pos',
  validate(salesController.createPOSValidators),
  salesController.createPOSSale
);

router.get('/invoices/:id', salesController.getInvoice);

export default router;
