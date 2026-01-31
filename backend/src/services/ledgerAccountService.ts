import mongoose from 'mongoose';
import { LedgerAccount, ILedgerAccount } from '../models/LedgerAccount';
import { AppError } from '../middlewares/errorHandler';

export async function listByCompany(
  companyId: string,
  opts: { type?: string; search?: string } = {}
): Promise<ILedgerAccount[]> {
  const filter: Record<string, unknown> = { companyId };
  if (opts.type) filter.type = opts.type;
  if (opts.search && opts.search.trim()) {
    const search = (opts.search as string).trim();
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { code: new RegExp(search, 'i') },
      { aliasName: new RegExp(search, 'i') },
    ];
  }
  return LedgerAccount.find(filter).populate('groupId', 'name code type').sort({ code: 1 }).lean();
}

export async function getById(ledgerAccountId: string, companyId: string): Promise<ILedgerAccount | null> {
  return LedgerAccount.findOne({ _id: ledgerAccountId, companyId }).populate('groupId').lean();
}

export async function getNextCode(companyId: string, prefix: string): Promise<string> {
  const last = await LedgerAccount.findOne({ companyId, code: new RegExp(`^${prefix}`) }).sort({ code: -1 }).lean();
  const num = last?.code ? parseInt(last.code.replace(/\D/g, ''), 10) + 1 : 1;
  return `${prefix}${num.toString().padStart(4, '0')}`;
}

export interface CreateLedgerAccountInput {
  companyId: string;
  name: string;
  aliasName?: string;
  code?: string;
  groupId: string;
  type: ILedgerAccount['type'];
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  location?: string;
  pincode?: string;
  TRN?: string;
  state?: string;
  stateCode?: string;
  costCentre?: string;
  creditLimit?: number;
  creditDays?: number;
  paymentTerms?: string;
  financialYearId?: string;
  openingBalanceDr?: number;
  openingBalanceCr?: number;
  serviceItem?: boolean;
  sacHsn?: string;
  taxable?: boolean;
  area?: string;
  route?: string;
  day?: string;
  district?: string;
  districtCode?: string;
  agency?: string;
  regDate?: Date;
  discPercent?: number;
  category?: string;
  rateType?: string;
  remarks?: string;
  rating?: string;
  story?: string;
  empCode?: string;
  salesMan?: string;
  person?: string;
  agent2?: string;
  branchId?: string;
  createdBy?: string;
}

export async function create(input: CreateLedgerAccountInput): Promise<ILedgerAccount> {
  const code = input.code || await getNextCode(input.companyId, input.type === 'Customer' ? 'CUST' : input.type === 'Supplier' ? 'SUP' : 'ACC');
  const existing = await LedgerAccount.findOne({ companyId: input.companyId, code });
  if (existing) throw new AppError('Code already exists', 400);

  const openingBalances: IOpeningBalance[] = [];
  if (input.financialYearId && (Number(input.openingBalanceDr) > 0 || Number(input.openingBalanceCr) > 0)) {
    const dr = Number(input.openingBalanceDr) || 0;
    const cr = Number(input.openingBalanceCr) || 0;
    const net = dr - cr;
    if (Math.abs(net) > 0.001) {
      openingBalances.push({
        financialYearId: new mongoose.Types.ObjectId(input.financialYearId),
        amount: Math.abs(net),
        isDebit: net > 0,
      });
    }
  }

  const account = await LedgerAccount.create({
    companyId: input.companyId,
    name: input.name,
    aliasName: input.aliasName,
    code,
    groupId: input.groupId,
    type: input.type,
    phone: input.phone,
    mobile: input.mobile,
    email: input.email,
    address: input.address,
    location: input.location,
    pincode: input.pincode,
    TRN: input.TRN,
    state: input.state,
    stateCode: input.stateCode,
    costCentre: input.costCentre,
    creditLimit: input.creditLimit,
    creditDays: input.creditDays,
    paymentTerms: input.paymentTerms,
    openingBalances,
    serviceItem: input.serviceItem,
    sacHsn: input.sacHsn,
    taxable: input.taxable,
    area: input.area,
    route: input.route,
    day: input.day,
    district: input.district,
    districtCode: input.districtCode,
    agency: input.agency,
    regDate: input.regDate,
    discPercent: input.discPercent,
    category: input.category,
    rateType: input.rateType,
    remarks: input.remarks,
    rating: input.rating,
    story: input.story,
    empCode: input.empCode,
    salesMan: input.salesMan,
    person: input.person,
    agent2: input.agent2,
    branchId: input.branchId ? new mongoose.Types.ObjectId(input.branchId) : undefined,
    createdBy: input.createdBy,
  });
  return account.toObject();
}

const updateableFields = [
  'name', 'aliasName', 'phone', 'mobile', 'email', 'address', 'location', 'pincode',
  'TRN', 'state', 'stateCode', 'costCentre', 'creditLimit', 'creditDays', 'paymentTerms',
  'groupId', 'serviceItem', 'sacHsn', 'taxable', 'area', 'route', 'day', 'district',
  'districtCode', 'agency', 'regDate', 'discPercent', 'category', 'rateType', 'remarks',
  'rating', 'story', 'empCode', 'salesMan', 'person', 'agent2', 'branchId',
] as const;

export async function update(
  ledgerAccountId: string,
  companyId: string,
  updates: Partial<Pick<ILedgerAccount, typeof updateableFields[number]>>,
  updatedBy?: string
): Promise<ILedgerAccount> {
  const safe: Record<string, unknown> = {};
  for (const key of updateableFields) {
    if (updates[key] !== undefined) safe[key] = updates[key];
  }
  const account = await LedgerAccount.findOneAndUpdate(
    { _id: ledgerAccountId, companyId },
    { ...safe, updatedBy: updatedBy ? new mongoose.Types.ObjectId(updatedBy) : undefined },
    { new: true }
  ).lean();
  if (!account) throw new AppError('Ledger account not found', 404);
  return account as ILedgerAccount;
}

export async function remove(ledgerAccountId: string, companyId: string): Promise<void> {
  const result = await LedgerAccount.deleteOne({ _id: ledgerAccountId, companyId });
  if (result.deletedCount === 0) throw new AppError('Ledger account not found', 404);
}
