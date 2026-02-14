import { Router } from 'express';
import * as ledgerGroupController from '../controllers/ledgerGroupController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authenticate);

router.get('/', ledgerGroupController.list);
router.get('/next-code', ledgerGroupController.getNextCode);
router.get('/:id', ledgerGroupController.get);
router.post('/', validate(ledgerGroupController.createValidators), ledgerGroupController.create);
router.put('/:id', validate(ledgerGroupController.updateValidators), ledgerGroupController.update);
router.delete('/:id', ledgerGroupController.remove);

export default router;
