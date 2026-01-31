import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

router.post(
  '/login',
  validate(authController.loginValidators),
  authController.login
);

router.get('/me', authenticate, authController.me);

router.post(
  '/change-password',
  authenticate,
  validate(authController.changePasswordValidators),
  authController.changePassword
);

export default router;
