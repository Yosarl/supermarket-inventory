import mongoose, { Document, Schema } from 'mongoose';

export interface IVatConfig {
  standardRate: number;
  zeroRatedCategories?: string[];
  exemptCategories?: string[];
}

export interface ICompanySettings {
  invoicePrefixSales?: string;
  invoicePrefixPurchase?: string;
  stockValuationMethod?: 'weighted_average' | 'fifo';
  [key: string]: unknown;
}

export interface ICompany extends Document {
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
  logoUrl?: string;
  defaultCurrency: string;
  vatConfig: IVatConfig;
  settings: ICompanySettings;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const VatConfigSchema = new Schema<IVatConfig>(
  {
    standardRate: { type: Number, default: 5 },
    zeroRatedCategories: [String],
    exemptCategories: [String],
  },
  { _id: false }
);

const CompanySchema = new Schema<ICompany>(
  {
    code: { type: String },
    name: { type: String, required: true },
    legalName: { type: String },
    address: { type: String },
    address1: { type: String },
    address2: { type: String },
    address3: { type: String },
    address4: { type: String },
    address5: { type: String },
    location: { type: String },
    pincode: { type: String },
    phone: { type: String },
    mobile: { type: String },
    email: { type: String },
    TRN: { type: String },
    state: { type: String },
    sCode: { type: String },
    bankName: { type: String },
    bankAccountNo: { type: String },
    bankIFSC: { type: String },
    country: { type: String, default: 'UAE' },
    logoUrl: { type: String },
    defaultCurrency: { type: String, default: 'AED' },
    vatConfig: { type: VatConfigSchema, default: () => ({ standardRate: 5 }) },
    settings: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
