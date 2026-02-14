import { Router } from 'express';
import * as companyController from '../controllers/companyController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate(companyController.createCompanyValidators),
  companyController.createCompany
);

router.get('/', companyController.listCompanies);
router.get('/next-code', companyController.getNextCode);
router.get('/:id', companyController.getCompany);
router.patch(
  '/:id',
  validate(companyController.updateCompanyValidators),
  companyController.updateCompany
);

export default router;
