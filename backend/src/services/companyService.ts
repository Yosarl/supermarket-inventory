import mongoose from 'mongoose';
import { Company, ICompany } from '../models/Company';
import { FinancialYear } from '../models/FinancialYear';
import { LedgerGroup } from '../models/LedgerGroup';
import { LedgerAccount } from '../models/LedgerAccount';
import { UnitOfMeasure } from '../models/UnitOfMeasure';
import { AppError } from '../middlewares/errorHandler';

export interface CreateCompanyInput {
  code?: string;
  name: string;
  legalName?: string;
  address?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  address4?: string;
  address5?: string;
  location?: string;
  pincode?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  TRN?: string;
  state?: string;
  sCode?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIFSC?: string;
  country?: string;
  defaultCurrency?: string;
  vatConfig?: { standardRate?: number };
  financialYearName?: string;
  financialYearStart: Date;
  financialYearEnd: Date;
  createdBy?: string;
}

export async function createCompany(input: CreateCompanyInput): Promise<ICompany> {
  const addressCombined = [input.address1, input.address2, input.address3, input.address4, input.address5]
    .filter(Boolean)
    .join(', ') || input.address;

  const company = await Company.create({
    code: input.code || 'COM',
    name: input.name,
    legalName: input.legalName,
    address: addressCombined,
    address1: input.address1,
    address2: input.address2,
    address3: input.address3,
    address4: input.address4,
    address5: input.address5,
    location: input.location,
    pincode: input.pincode,
    phone: input.phone,
    mobile: input.mobile,
    email: input.email,
    TRN: input.TRN,
    state: input.state,
    sCode: input.sCode,
    bankName: input.bankName,
    bankAccountNo: input.bankAccountNo,
    bankIFSC: input.bankIFSC,
    country: input.country || 'UAE',
    defaultCurrency: input.defaultCurrency || 'AED',
    vatConfig: { standardRate: input.vatConfig?.standardRate ?? 5 },
    settings: { invoicePrefixSales: 'INV', invoicePrefixPurchase: 'PUR', stockValuationMethod: 'weighted_average' },
    createdBy: input.createdBy,
  });

  const fy = await FinancialYear.create({
    companyId: company._id,
    name: input.financialYearName || `FY ${new Date(input.financialYearStart).getFullYear()}`,
    startDate: input.financialYearStart,
    endDate: input.financialYearEnd,
    isCurrent: true,
    status: 'open',
    createdBy: input.createdBy,
  });

  await seedDefaultLedgerStructure(company._id, fy._id, input.createdBy);
  await seedDefaultUnits(company._id.toString(), input.createdBy);

  return company;
}

async function seedDefaultLedgerStructure(
  companyId: mongoose.Types.ObjectId,
  financialYearId: mongoose.Types.ObjectId,
  createdBy?: string
): Promise<void> {
  const cid = companyId.toString();
  const groups = [
    { code: 'ASSET', name: 'Assets', type: 'Asset' as const },
    { code: 'LIAB', name: 'Liabilities', type: 'Liability' as const },
    { code: 'EQUITY', name: 'Equity', type: 'Equity' as const },
    { code: 'INCOME', name: 'Income', type: 'Income' as const },
    { code: 'EXP', name: 'Expenses', type: 'Expense' as const },
  ];
  const createdGroups: Record<string, mongoose.Types.ObjectId> = {};
  for (const g of groups) {
    const grp = await LedgerGroup.create({
      companyId: cid,
      code: g.code,
      name: g.name,
      type: g.type,
      createdBy,
    });
    createdGroups[g.code] = grp._id;
  }

  const cashGroup = await LedgerGroup.create({
    companyId: cid,
    code: 'CASH',
    name: 'Cash',
    type: 'Asset',
    isCash: true,
    parentGroupId: createdGroups['ASSET'],
    createdBy,
  });
  const bankGroup = await LedgerGroup.create({
    companyId: cid,
    code: 'BANK',
    name: 'Bank',
    type: 'Asset',
    isBank: true,
    parentGroupId: createdGroups['ASSET'],
    createdBy,
  });
  const receivablesGroup = await LedgerGroup.create({
    companyId: cid,
    code: 'RECV',
    name: 'Receivables',
    type: 'Asset',
    isReceivables: true,
    parentGroupId: createdGroups['ASSET'],
    createdBy,
  });
  const payablesGroup = await LedgerGroup.create({
    companyId: cid,
    code: 'PAY',
    name: 'Payables',
    type: 'Liability',
    isPayables: true,
    parentGroupId: createdGroups['LIAB'],
    createdBy,
  });
  const salesGroup = await LedgerGroup.create({
    companyId: cid,
    code: 'SALES',
    name: 'Sales',
    type: 'Income',
    isSales: true,
    parentGroupId: createdGroups['INCOME'],
    createdBy,
  });
  const purchasesGroup = await LedgerGroup.create({
    companyId: cid,
    code: 'PURCH',
    name: 'Purchases',
    type: 'Expense',
    isPurchases: true,
    parentGroupId: createdGroups['EXP'],
    createdBy,
  });

  await LedgerAccount.create([
    { companyId: cid, name: 'Cash in Hand', code: 'CASH001', groupId: cashGroup._id, type: 'Cash', openingBalances: [{ financialYearId, amount: 0, isDebit: true }], createdBy },
    { companyId: cid, name: 'Main Bank', code: 'BANK001', groupId: bankGroup._id, type: 'Bank', openingBalances: [{ financialYearId, amount: 0, isDebit: true }], createdBy },
    { companyId: cid, name: 'Sales Account', code: 'SALES001', groupId: salesGroup._id, type: 'Revenue', openingBalances: [], createdBy },
    { companyId: cid, name: 'Purchase Account', code: 'PURCH001', groupId: purchasesGroup._id, type: 'Expense', openingBalances: [], createdBy },
  ]);
}

async function seedDefaultUnits(companyId: string, createdBy?: string): Promise<void> {
  const units = [
    { name: 'Piece', shortCode: 'PCS' },
    { name: 'Kilogram', shortCode: 'KG' },
    { name: 'Liter', shortCode: 'LTR' },
    { name: 'Pack', shortCode: 'PACK' },
    { name: 'Box', shortCode: 'BOX' },
  ];
  for (const u of units) {
    await UnitOfMeasure.findOneAndUpdate(
      { companyId, shortCode: u.shortCode },
      { $setOnInsert: { companyId, name: u.name, shortCode: u.shortCode, createdBy } },
      { upsert: true }
    );
  }
}

export async function getCompaniesForUser(userId: string): Promise<ICompany[]> {
  const { User } = await import('../models/User');
  const user = await User.findById(userId);
  if (!user) return [];
  if (user.roles.includes('Admin')) {
    return Company.find({}).lean();
  }
  return Company.find({ _id: { $in: user.companyAccess } }).lean() as Promise<ICompany[]>;
}

export async function getById(companyId: string): Promise<ICompany | null> {
  return Company.findById(companyId).lean();
}
