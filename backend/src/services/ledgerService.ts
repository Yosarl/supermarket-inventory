import mongoose from 'mongoose';
import { LedgerEntry } from '../models/LedgerEntry';
import { LedgerAccount } from '../models/LedgerAccount';
import { Voucher } from '../models/Voucher';
import { AppError } from '../middlewares/errorHandler';

export interface LedgerLine {
  ledgerAccountId: string;
  debitAmount: number;
  creditAmount: number;
  narration?: string;
}

export async function postVoucherLines(
  companyId: string,
  financialYearId: string,
  date: Date,
  lines: LedgerLine[],
  voucherId: string,
  referenceType?: string,
  referenceId?: string,
  userId?: string
): Promise<void> {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of lines) {
    totalDebit += line.debitAmount;
    totalCredit += line.creditAmount;
  }
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new AppError('Voucher is not balanced: total debits must equal total credits', 400);
  }

  const entries = lines.map((line) => ({
    companyId: new mongoose.Types.ObjectId(companyId),
    financialYearId: new mongoose.Types.ObjectId(financialYearId),
    date,
    voucherId: new mongoose.Types.ObjectId(voucherId),
    referenceType,
    referenceId: referenceId ? new mongoose.Types.ObjectId(referenceId) : undefined,
    ledgerAccountId: new mongoose.Types.ObjectId(line.ledgerAccountId),
    debitAmount: line.debitAmount,
    creditAmount: line.creditAmount,
    narration: line.narration,
    createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
  }));

  await LedgerEntry.insertMany(entries);
}

export async function getLedgerReport(
  companyId: string,
  financialYearId: string,
  ledgerAccountId: string,
  fromDate: Date,
  toDate: Date
): Promise<{
  openingBalance: number;
  openingIsDebit: boolean;
  transactions: Array<{
    date: Date;
    voucherNo?: string;
    narration?: string;
    debit: number;
    credit: number;
    balance: number;
    balanceIsDebit: boolean;
  }>;
  closingBalance: number;
  closingIsDebit: boolean;
  totalDebit: number;
  totalCredit: number;
}> {
  const account = await LedgerAccount.findById(ledgerAccountId);
  if (!account) throw new AppError('Ledger account not found', 404);

  const ob = account.openingBalances.find(
    (b) => b.financialYearId.toString() === financialYearId
  );
  let openingBalance = ob ? ob.amount : 0;
  let openingIsDebit = ob ? ob.isDebit : true;

  const entries = await LedgerEntry.find({
    companyId,
    financialYearId,
    ledgerAccountId,
    date: { $gte: fromDate, $lte: toDate },
  })
    .sort({ date: 1, createdAt: 1 })
    .populate('voucherId', 'voucherNo')
    .lean();

  let runningBalance = openingBalance;
  if (!openingIsDebit) runningBalance = -runningBalance;

  const transactions: Array<{
    date: Date;
    voucherNo?: string;
    narration?: string;
    debit: number;
    credit: number;
    balance: number;
    balanceIsDebit: boolean;
  }> = [];

  for (const e of entries) {
    const debit = e.debitAmount || 0;
    const credit = e.creditAmount || 0;
    runningBalance += debit - credit;
    const balanceIsDebit = runningBalance >= 0;
    transactions.push({
      date: e.date,
      voucherNo: (e.voucherId as { voucherNo?: string })?.voucherNo,
      narration: e.narration,
      debit,
      credit,
      balance: Math.abs(runningBalance),
      balanceIsDebit,
    });
  }

  const totalDebit = entries.reduce((s, e) => s + (e.debitAmount || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.creditAmount || 0), 0);
  const closingBalance = Math.abs(runningBalance);
  const closingIsDebit = runningBalance >= 0;

  return {
    openingBalance: ob ? ob.amount : 0,
    openingIsDebit,
    transactions,
    closingBalance,
    closingIsDebit,
    totalDebit,
    totalCredit,
  };
}

export async function getTrialBalance(
  companyId: string,
  financialYearId: string,
  asAtDate: Date
): Promise<Array<{ ledgerAccountId: string; name: string; code: string; debit: number; credit: number }>> {
  const accounts = await LedgerAccount.find({ companyId }).populate('groupId', 'name code type').lean();
  const entries = await LedgerEntry.aggregate([
    {
      $match: {
        companyId: new mongoose.Types.ObjectId(companyId),
        financialYearId: new mongoose.Types.ObjectId(financialYearId),
        date: { $lte: asAtDate },
      },
    },
    {
      $group: {
        _id: '$ledgerAccountId',
        debit: { $sum: '$debitAmount' },
        credit: { $sum: '$creditAmount' },
      },
    },
  ]);

  const entryMap = new Map(
    entries.map((e) => [e._id.toString(), { debit: e.debit, credit: e.credit }])
  );

  const result: Array<{ ledgerAccountId: string; name: string; code: string; debit: number; credit: number }> = [];
  for (const acc of accounts) {
    const id = acc._id.toString();
    const ob = (acc.openingBalances || []).find(
      (b: { financialYearId: { toString: () => string } }) => b.financialYearId.toString() === financialYearId
    );
    let debit = ob && ob.isDebit ? ob.amount : 0;
    let credit = ob && !ob.isDebit ? ob.amount : 0;
    const e = entryMap.get(id);
    if (e) {
      debit += e.debit;
      credit += e.credit;
    }
    const balance = debit - credit;
    if (Math.abs(balance) < 0.01) continue;
    result.push({
      ledgerAccountId: id,
      name: acc.name,
      code: acc.code,
      debit: balance > 0 ? balance : 0,
      credit: balance < 0 ? -balance : 0,
    });
  }

  return result;
}

export async function getProfitLoss(
  companyId: string,
  financialYearId: string,
  fromDate: Date,
  toDate: Date
): Promise<{ income: number; expenses: number; netProfit: number; groups: Array<{ type: string; name: string; amount: number }> }> {
  const tb = await getTrialBalance(companyId, financialYearId, toDate);
  const accounts = await LedgerAccount.find({ companyId }).populate('groupId', 'name code type').lean();
  const accMap = new Map(accounts.map((a) => [a._id.toString(), a]));
  const tbMap = new Map(tb.map((r) => [r.ledgerAccountId, { debit: r.debit, credit: r.credit }]));
  let income = 0;
  let expenses = 0;
  const groups: Array<{ type: string; name: string; amount: number }> = [];
  for (const acc of accounts) {
    const g = acc.groupId as { type?: string; name?: string } | null;
    const type = g?.type ?? 'Other';
    const t = tbMap.get(acc._id.toString());
    const debit = t?.debit ?? 0;
    const credit = t?.credit ?? 0;
    const net = credit - debit;
    if (type === 'Income') {
      income += net;
      if (Math.abs(net) > 0.01) groups.push({ type: 'Income', name: acc.name, amount: net });
    } else if (type === 'Expense') {
      const expAmt = debit - credit;
      expenses += expAmt;
      if (Math.abs(expAmt) > 0.01) groups.push({ type: 'Expense', name: acc.name, amount: expAmt });
    }
  }
  return { income, expenses, netProfit: income - expenses, groups };
}

export async function getBalanceSheet(
  companyId: string,
  financialYearId: string,
  asAtDate: Date
): Promise<{ assets: number; liabilities: number; equity: number; balanced: boolean; groups: Array<{ type: string; name: string; amount: number }> }> {
  const tb = await getTrialBalance(companyId, financialYearId, asAtDate);
  const accounts = await LedgerAccount.find({ companyId }).populate('groupId', 'name code type').lean();
  const tbMap = new Map(tb.map((r) => [r.ledgerAccountId, { debit: r.debit, credit: r.credit }]));
  let assets = 0;
  let liabilities = 0;
  let equity = 0;
  const groups: Array<{ type: string; name: string; amount: number }> = [];
  for (const acc of accounts) {
    const g = acc.groupId as { type?: string } | null;
    const type = g?.type ?? 'Other';
    const t = tbMap.get(acc._id.toString());
    const debit = t?.debit ?? 0;
    const credit = t?.credit ?? 0;
    if (type === 'Asset') {
      const amt = debit - credit;
      assets += amt;
      if (Math.abs(amt) > 0.01) groups.push({ type: 'Asset', name: acc.name, amount: amt });
    } else if (type === 'Liability') {
      const amt = credit - debit;
      liabilities += amt;
      if (Math.abs(amt) > 0.01) groups.push({ type: 'Liability', name: acc.name, amount: amt });
    } else if (type === 'Equity') {
      const amt = credit - debit;
      equity += amt;
      if (Math.abs(amt) > 0.01) groups.push({ type: 'Equity', name: acc.name, amount: amt });
    }
  }
  const balanced = Math.abs(assets - (liabilities + equity)) < 0.02;
  return { assets, liabilities, equity, balanced, groups };
}
