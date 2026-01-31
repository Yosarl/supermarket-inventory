import { Router } from 'express';
import * as financialYearController from '../controllers/financialYearController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authenticate);

router.get('/current', financialYearController.getCurrent);
router.post('/set-current', validate(financialYearController.setCurrentValidators), financialYearController.setCurrent);
router.get('/', financialYearController.list);
router.post('/', validate(financialYearController.createValidators), financialYearController.create);

export default router;
