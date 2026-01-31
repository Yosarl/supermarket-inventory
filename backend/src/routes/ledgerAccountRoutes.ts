import { Router } from 'express';
import * as ledgerAccountController from '../controllers/ledgerAccountController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authenticate);

router.get('/', ledgerAccountController.list);
router.get('/:id', ledgerAccountController.getById);
router.post('/', validate(ledgerAccountController.createValidators), ledgerAccountController.create);
router.patch('/:id', validate(ledgerAccountController.updateValidators), ledgerAccountController.update);
router.delete('/:id', ledgerAccountController.remove);

export default router;
