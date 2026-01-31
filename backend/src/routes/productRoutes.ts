import { Router } from 'express';
import * as productController from '../controllers/productController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate(productController.createProductValidators),
  productController.createProduct
);

router.get('/', productController.list);
router.get('/barcode', productController.getByBarcode);
router.get('/units', productController.getUnits);
router.get('/:id', productController.getById);

export default router;
