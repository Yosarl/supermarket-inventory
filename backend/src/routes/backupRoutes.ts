import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { BackupMetadata } from '../models/BackupMetadata';
import { AuditLog } from '../models/AuditLog';

const router = Router();

router.use(authenticate);
router.use(requireRole('Admin'));

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id.toString();
    await BackupMetadata.create({
      performedBy: req.user!._id,
      performedAt: new Date(),
      fileName: `backup-${new Date().toISOString().slice(0, 10)}.archive`,
      details: 'Manual backup triggered via UI (mongodump not executed in scaffold)',
    });
    await AuditLog.create({
      userId: req.user!._id,
      action: 'Backup',
      entityType: 'Backup',
      details: 'Backup requested',
    });
    res.json({ success: true, message: 'Backup request recorded. Full mongodump integration can be added for production.' });
  } catch (err) {
    next(err);
  }
});

export default router;
