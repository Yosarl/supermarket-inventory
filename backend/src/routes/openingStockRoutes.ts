import { Router } from 'express';
import * as openingStockController from '../controllers/openingStockController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate(openingStockController.postOpeningStockValidators),
  openingStockController.postOpeningStock
);

router.post(
  '/import',
  validate(openingStockController.importOpeningStockValidators),
  openingStockController.importOpeningStock
);

export default router;
