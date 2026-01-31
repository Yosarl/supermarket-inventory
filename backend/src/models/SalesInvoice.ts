import mongoose, { Document, Schema } from 'mongoose';

export type SalesInvoiceType = 'POS' | 'B2C' | 'B2B' | 'Quotation' | 'Return';
export type SalesInvoiceStatus = 'Draft' | 'Final' | 'Cancelled' | 'Returned';

export interface IPaymentDetail {
  mode: string;
  amount: number;
  reference?: string;
}

export interface ISalesInvoice extends Document {
  companyId: mongoose.Types.ObjectId;
  financialYearId: mongoose.Types.ObjectId;
  invoiceNo: string;
  date: Date;
  time?: string;
  type: SalesInvoiceType;
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  customerTRN?: string;
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
  paymentDetails: IPaymentDetail[];
  status: SalesInvoiceStatus;
  voucherId?: mongoose.Types.ObjectId;
  originalInvoiceId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const PaymentDetailSchema = new Schema<IPaymentDetail>(
  { mode: String, amount: Number, reference: String },
  { _id: false }
);

const SalesInvoiceSchema = new Schema<ISalesInvoice>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    financialYearId: { type: Schema.Types.ObjectId, ref: 'FinancialYear', required: true },
    invoiceNo: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String },
    type: { type: String, enum: ['POS', 'B2C', 'B2B', 'Quotation', 'Return'], required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'LedgerAccount' },
    customerName: { type: String },
    customerTRN: { type: String },
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    paymentDetails: [PaymentDetailSchema],
    status: { type: String, enum: ['Draft', 'Final', 'Cancelled', 'Returned'], default: 'Draft' },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher' },
    originalInvoiceId: { type: Schema.Types.ObjectId, ref: 'SalesInvoice' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

SalesInvoiceSchema.index({ companyId: 1, financialYearId: 1, invoiceNo: 1 }, { unique: true });
SalesInvoiceSchema.index({ companyId: 1, date: 1 });
SalesInvoiceSchema.index({ customerId: 1 });

export const SalesInvoice = mongoose.model<ISalesInvoice>('SalesInvoice', SalesInvoiceSchema);
