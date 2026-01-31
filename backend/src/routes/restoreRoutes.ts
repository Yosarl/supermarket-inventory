import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { AuditLog } from '../models/AuditLog';

const router = Router();

router.use(authenticate);
router.use(requireRole('Admin'));

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await AuditLog.create({
      userId: req.user!._id,
      action: 'Restore',
      entityType: 'Restore',
      details: 'Restore requested (restore from archive not executed in scaffold)',
    });
    res.json({ success: true, message: 'Restore request recorded. Full restore integration can be added for production.' });
  } catch (err) {
    next(err);
  }
});

export default router;
