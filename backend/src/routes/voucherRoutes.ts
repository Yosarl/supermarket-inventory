import { Router } from 'express';
import * as voucherController from '../controllers/voucherController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authenticate);

router.get('/', voucherController.list);
router.post('/', validate(voucherController.createValidators), voucherController.create);

export default router;
