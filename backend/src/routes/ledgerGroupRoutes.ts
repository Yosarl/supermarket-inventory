import { Router } from 'express';
import * as ledgerGroupController from '../controllers/ledgerGroupController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authenticate);

router.get('/', ledgerGroupController.list);
router.post('/', validate(ledgerGroupController.createValidators), ledgerGroupController.create);

export default router;
