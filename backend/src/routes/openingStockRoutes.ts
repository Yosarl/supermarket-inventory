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

// Document-based entries (list, get, create, update)
router.get('/entries', openingStockController.listOpeningStockEntries);
router.get('/entries/next-entry-no', openingStockController.getNextOpeningStockEntryNo);
router.get('/entries/:id', openingStockController.getOpeningStockEntryById);
router.post(
  '/entries',
  validate(openingStockController.createOpeningStockEntryValidators),
  openingStockController.createOpeningStockEntry
);
router.put(
  '/entries/:id',
  validate(openingStockController.createOpeningStockEntryValidators),
  openingStockController.updateOpeningStockEntry
);
router.delete('/entries/:id', openingStockController.deleteOpeningStockEntry);

export default router;
