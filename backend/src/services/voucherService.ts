import { Voucher, IVoucher } from '../models/Voucher';
import { LedgerEntry } from '../models/LedgerEntry';
import { AppError } from '../middlewares/errorHandler';
import * as ledgerService from './ledgerService';

export interface CreateVoucherInput {
  companyId: string;
  financialYearId: string;
  voucherType: IVoucher['voucherType'];
  date: Date;
  narration?: string;
  lines: Array<{ ledgerAccountId: string; debitAmount: number; creditAmount: number; narration?: string }>;
  chequeNumber?: string;
  chequeDate?: Date;
  bankLedgerId?: string;
  createdBy?: string;
}

export async function getNextVoucherNo(
  companyId: string,
  financialYearId: string,
  voucherType: string
): Promise<string> {
  const prefix = voucherType === 'Receipt' ? 'RV' : voucherType === 'Payment' ? 'PV' : voucherType === 'Journal' ? 'JV' : voucherType === 'Opening' ? 'OP' : 'CH';
  const last = await Voucher.findOne({ companyId, financialYearId, voucherType })
    .sort({ voucherNo: -1 })
    .lean();
  const num = last?.voucherNo ? parseInt(last.voucherNo.replace(/\D/g, ''), 10) + 1 : 1;
  return `${prefix}-${num.toString().padStart(5, '0')}`;
}

export async function createAndPost(
  input: CreateVoucherInput
): Promise<IVoucher> {
  const totalDebit = input.lines.reduce((s, l) => s + l.debitAmount, 0);
  const totalCredit = input.lines.reduce((s, l) => s + l.creditAmount, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new AppError('Voucher must be balanced', 400);
  }

  const voucherNo = await getNextVoucherNo(
    input.companyId,
    input.financialYearId,
    input.voucherType
  );

  const voucher = await Voucher.create({
    companyId: input.companyId,
    financialYearId: input.financialYearId,
    voucherType: input.voucherType,
    voucherNo,
    date: input.date,
    narration: input.narration,
    lines: input.lines.map((l) => ({
      ledgerAccountId: l.ledgerAccountId,
      debitAmount: l.debitAmount,
      creditAmount: l.creditAmount,
      narration: l.narration,
    })),
    totalDebit,
    totalCredit,
    status: 'Posted',
    chequeNumber: input.chequeNumber,
    chequeDate: input.chequeDate,
    bankLedgerId: input.bankLedgerId,
    createdBy: input.createdBy,
  });

  await ledgerService.postVoucherLines(
    input.companyId,
    input.financialYearId,
    input.date,
    input.lines.map((l) => ({
      ledgerAccountId: l.ledgerAccountId,
      debitAmount: l.debitAmount,
      creditAmount: l.creditAmount,
      narration: l.narration,
    })),
    voucher._id.toString(),
    undefined,
    undefined,
    input.createdBy
  );

  return voucher.toObject();
}

export async function deleteVoucher(voucherId: string): Promise<void> {
  // Delete associated ledger entries
  await LedgerEntry.deleteMany({ voucherId });
  // Delete the voucher itself
  await Voucher.deleteOne({ _id: voucherId });
}

export async function list(
  companyId: string,
  financialYearId: string,
  opts: { voucherType?: string; fromDate?: Date; toDate?: Date; page?: number; limit?: number } = {}
): Promise<{ vouchers: IVoucher[]; total: number }> {
  const filter: Record<string, unknown> = { companyId, financialYearId };
  if (opts.voucherType) filter.voucherType = opts.voucherType;
  if (opts.fromDate || opts.toDate) {
    filter.date = {};
    if (opts.fromDate) (filter.date as Record<string, Date>).$gte = opts.fromDate;
    if (opts.toDate) (filter.date as Record<string, Date>).$lte = opts.toDate;
  }
  const total = await Voucher.countDocuments(filter);
  const page = opts.page ?? 1;
  const limit = Math.min(opts.limit ?? 20, 100);
  const vouchers = await Voucher.find(filter)
    .populate('lines.ledgerAccountId', 'name code')
    .sort({ date: -1, voucherNo: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean() as unknown as IVoucher[];
  return { vouchers, total };
}
