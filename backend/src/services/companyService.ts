import mongoose from 'mongoose';
import { Company, ICompany } from '../models/Company';
import { FinancialYear } from '../models/FinancialYear';
import { LedgerGroup } from '../models/LedgerGroup';
import { LedgerAccount } from '../models/LedgerAccount';
import { UnitOfMeasure } from '../models/UnitOfMeasure';
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

/** Returns next system-generated company code: com, com1, com2, ... */
export async function getNextCompanyCode(): Promise<string> {
  const companies = await Company.find({ code: /^com\d*$/i }).select('code').lean();
  let max = -1;
  for (const c of companies) {
    const code = (c.code || '').toLowerCase();
    if (code === 'com') max = Math.max(max, 0);
    else {
      const num = parseInt(code.replace(/^com/i, '') || '0', 10);
      if (!isNaN(num)) max = Math.max(max, num);
    }
  }
  return max < 0 ? 'com' : `com${max + 1}`;
}

export async function createCompany(input: CreateCompanyInput): Promise<ICompany> {
  const addressCombined = [input.address1, input.address2, input.address3, input.address4, input.address5]
    .filter(Boolean)
    .join(', ') || input.address;

  const codeToUse = await getNextCompanyCode();

  const company = await Company.create({
    code: codeToUse,
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

  if (input.createdBy) {
    const { User } = await import('../models/User');
    await User.findByIdAndUpdate(input.createdBy, {
      $addToSet: { companyAccess: company._id },
    });
  }

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

async function seedDefaultUnits(_companyId: string, createdBy?: string): Promise<void> {
  // Units are now global - seed once for all companies
  const units = [
    { name: 'Piece', shortCode: 'PCS' },
    { name: 'Kilogram', shortCode: 'KG' },
    { name: 'Liter', shortCode: 'LTR' },
    { name: 'Pack', shortCode: 'PACK' },
    { name: 'Box', shortCode: 'BOX' },
  ];
  for (const u of units) {
    await UnitOfMeasure.findOneAndUpdate(
      { shortCode: u.shortCode }, // Global lookup by shortCode only
      { $setOnInsert: { name: u.name, shortCode: u.shortCode, isGlobal: true, createdBy } },
      { upsert: true }
    );
  }
}

export async function getCompaniesForUser(userId: string): Promise<ICompany[]> {
  const { User } = await import('../models/User');
  const user = await User.findById(userId);
  if (!user) return [];
  if (user.roles.includes('Admin')) {
    return Company.find({}).lean() as unknown as ICompany[];
  }
  return Company.find({ _id: { $in: user.companyAccess } }).lean() as unknown as Promise<ICompany[]>;
}

export async function getById(companyId: string): Promise<ICompany | null> {
  return Company.findById(companyId).lean() as unknown as ICompany | null;
}

export interface UpdateCompanyInput {
  code?: string;
  name?: string;
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
  updatedBy?: string;
}

export async function updateCompany(
  companyId: string,
  input: UpdateCompanyInput
): Promise<ICompany | null> {
  const addressCombined = [input.address1, input.address2, input.address3, input.address4, input.address5]
    .filter(Boolean)
    .join(', ') || input.address;

  const set: Record<string, unknown> = {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.legalName !== undefined && { legalName: input.legalName }),
    ...(addressCombined !== undefined && { address: addressCombined }),
    ...(input.address1 !== undefined && { address1: input.address1 }),
    ...(input.address2 !== undefined && { address2: input.address2 }),
    ...(input.address3 !== undefined && { address3: input.address3 }),
    ...(input.address4 !== undefined && { address4: input.address4 }),
    ...(input.address5 !== undefined && { address5: input.address5 }),
    ...(input.location !== undefined && { location: input.location }),
    ...(input.pincode !== undefined && { pincode: input.pincode }),
    ...(input.phone !== undefined && { phone: input.phone }),
    ...(input.mobile !== undefined && { mobile: input.mobile }),
    ...(input.email !== undefined && { email: input.email }),
    ...(input.TRN !== undefined && { TRN: input.TRN }),
    ...(input.state !== undefined && { state: input.state }),
    ...(input.sCode !== undefined && { sCode: input.sCode }),
    ...(input.bankName !== undefined && { bankName: input.bankName }),
    ...(input.bankAccountNo !== undefined && { bankAccountNo: input.bankAccountNo }),
    ...(input.bankIFSC !== undefined && { bankIFSC: input.bankIFSC }),
    ...(input.country !== undefined && input.country !== null && { country: String(input.country).trim() || 'UAE' }),
    ...(input.defaultCurrency !== undefined && { defaultCurrency: input.defaultCurrency }),
    ...(input.updatedBy && { updatedBy: input.updatedBy }),
  };

  const updated = await Company.findByIdAndUpdate(
    companyId,
    { $set: set },
    { new: true }
  ).lean();

  return updated as ICompany | null;
}
