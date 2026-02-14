import { FinancialYear, IFinancialYear } from '../models/FinancialYear';
import { AppError } from '../middlewares/errorHandler';

export async function getCurrentForCompany(companyId: string): Promise<IFinancialYear | null> {
  return FinancialYear.findOne({ companyId, isCurrent: true }).lean() as unknown as IFinancialYear | null;
}

export async function setCurrent(companyId: string, financialYearId: string, userId?: string): Promise<IFinancialYear> {
  await FinancialYear.updateMany({ companyId }, { $set: { isCurrent: false } });
  const fy = await FinancialYear.findOneAndUpdate(
    { _id: financialYearId, companyId },
    { $set: { isCurrent: true, updatedBy: userId } },
    { new: true }
  );
  if (!fy) throw new AppError('Financial year not found', 404);
  return fy;
}

export async function listByCompany(companyId: string): Promise<IFinancialYear[]> {
  return FinancialYear.find({ companyId }).sort({ startDate: -1 }).lean() as unknown as IFinancialYear[];
}

export async function create(
  companyId: string,
  name: string,
  startDate: Date,
  endDate: Date,
  createdBy?: string
): Promise<IFinancialYear> {
  if (startDate >= endDate) throw new AppError('Start date must be before end date', 400);
  const existing = await FinancialYear.findOne({ companyId, name });
  if (existing) throw new AppError('Financial year with this name already exists', 400);
  const isFirst = (await FinancialYear.countDocuments({ companyId })) === 0;
  const fy = await FinancialYear.create({
    companyId,
    name,
    startDate,
    endDate,
    isCurrent: isFirst,
    status: 'open',
    createdBy,
  });
  return fy.toObject();
}
