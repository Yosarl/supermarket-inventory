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
router.get('/:id', companyController.getCompany);

export default router;
