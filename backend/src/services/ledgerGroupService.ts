import { LedgerGroup, ILedgerGroup } from '../models/LedgerGroup';
import { AppError } from '../middlewares/errorHandler';

export async function listByCompany(companyId: string): Promise<ILedgerGroup[]> {
  return LedgerGroup.find({ companyId }).sort({ type: 1, code: 1 }).lean();
}

export async function getById(groupId: string, companyId: string): Promise<ILedgerGroup | null> {
  return LedgerGroup.findOne({ _id: groupId, companyId }).lean();
}

export interface CreateLedgerGroupInput {
  companyId: string;
  name: string;
  code: string;
  type: ILedgerGroup['type'];
  parentGroupId?: string;
  createdBy?: string;
}

export async function create(input: CreateLedgerGroupInput): Promise<ILedgerGroup> {
  const existing = await LedgerGroup.findOne({ companyId: input.companyId, code: input.code });
  if (existing) throw new AppError('Group code already exists', 400);
  const group = await LedgerGroup.create({
    companyId: input.companyId,
    name: input.name,
    code: input.code,
    type: input.type,
    parentGroupId: input.parentGroupId,
    createdBy: input.createdBy,
  });
  return group.toObject();
}
