import { Router } from 'express';
import * as productController from '../controllers/productController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { uploadProductImage } from '../middlewares/upload';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate(productController.createProductValidators),
  productController.createProduct
);

router.get('/', productController.list);
router.get('/next-code', productController.getNextCode);
router.get('/categories', productController.getCategories);
router.post(
  '/categories',
  validate(productController.createCategoryValidators),
  productController.createCategory
);
router.get('/item-groups', productController.getItemGroups);
router.get('/brands', productController.getBrands);
router.get('/barcode', productController.getByBarcode);
router.get('/imei', productController.getByImei);
router.get('/units', productController.getUnits);
router.post(
  '/units',
  validate(productController.createUnitValidators),
  productController.createUnit
);
router.post(
  '/upload-image',
  (req, res, next) => {
    uploadProductImage(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        const isSize = message.toLowerCase().includes('file too large') || (err as { code?: string }).code === 'LIMIT_FILE_SIZE';
        return res.status(400).json({ success: false, message: isSize ? 'Image size must be 20MB or less' : message });
      }
      next();
    });
  },
  productController.uploadProductImage
);
router.get('/:id', productController.getById);
router.patch('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

export default router;
