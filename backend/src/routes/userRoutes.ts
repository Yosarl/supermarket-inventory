import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { validate } from '../middlewares/validate';

const router = Router();

router.use(authenticate);
router.use(requireRole('Admin'));

router.get('/', userController.list);
router.get('/:id', userController.getById);
router.post('/', validate(userController.createUserValidators), userController.create);
router.patch('/:id', validate(userController.updateValidators), userController.update);
router.post('/:id/reset-password', validate(userController.resetPasswordValidators), userController.resetPassword);

export default router;
