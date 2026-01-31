import mongoose from 'mongoose';
import { AuditLog, IAuditLog } from '../models/AuditLog';

export async function list(
  opts: { companyId?: string; userId?: string; entityType?: string; action?: string; fromDate?: Date; toDate?: Date; page?: number; limit?: number } = {}
): Promise<{ logs: IAuditLog[]; total: number }> {
  const filter: Record<string, unknown> = {};
  if (opts.companyId) filter.companyId = new mongoose.Types.ObjectId(opts.companyId);
  if (opts.userId) filter.userId = new mongoose.Types.ObjectId(opts.userId);
  if (opts.entityType) filter.entityType = opts.entityType;
  if (opts.action) filter.action = opts.action;
  if (opts.fromDate || opts.toDate) {
    filter.timestamp = {};
    if (opts.fromDate) (filter.timestamp as Record<string, Date>).$gte = opts.fromDate;
    if (opts.toDate) (filter.timestamp as Record<string, Date>).$lte = opts.toDate;
  }
  const total = await AuditLog.countDocuments(filter);
  const page = opts.page ?? 1;
  const limit = Math.min(opts.limit ?? 50, 100);
  const logs = await AuditLog.find(filter)
    .populate('userId', 'username fullName')
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  return { logs, total };
}
