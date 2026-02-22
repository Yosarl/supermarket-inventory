import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchaseReturnItem {
  productId: mongoose.Types.ObjectId;
  productCode: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  discAmount: number;
  unitId?: string;
  unitName?: string;
  multiUnitId?: string;
}

export interface IPurchaseReturn extends Document {
  companyId: mongoose.Types.ObjectId;
  financialYearId: mongoose.Types.ObjectId;
  invoiceNo: string;
  date: Date;
  returnType: 'OnAccount' | 'ByRef';
  originalPurchaseId?: mongoose.Types.ObjectId;
  supplierId?: mongoose.Types.ObjectId;
  supplierName?: string;
  supplierInvoiceNo?: string;
  cashAccountId?: mongoose.Types.ObjectId;
  vatType: 'Vat' | 'NonVat';
  taxMode?: 'inclusive' | 'exclusive';
  narration?: string;
  items: IPurchaseReturnItem[];
  totalAmount: number;
  itemsDiscount: number;
  otherDiscount: number;
  otherCharges: number;
  freightCharge: number;
  roundOff: number;
  voucherId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseReturnItemSchema = new Schema<IPurchaseReturnItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productCode: { type: String, default: '' },
    productName: { type: String, default: '' },
    batchNumber: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    purchasePrice: { type: Number, default: 0 },
    discAmount: { type: Number, default: 0 },
    unitId: { type: String },
    unitName: { type: String },
    multiUnitId: { type: String },
  },
  { _id: false }
);

const PurchaseReturnSchema = new Schema<IPurchaseReturn>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    financialYearId: { type: Schema.Types.ObjectId, ref: 'FinancialYear', required: true },
    invoiceNo: { type: String, required: true },
    date: { type: Date, required: true },
    returnType: { type: String, enum: ['OnAccount', 'ByRef'], default: 'OnAccount' },
    originalPurchaseId: { type: Schema.Types.ObjectId, ref: 'PurchaseInvoice' },
    supplierId: { type: Schema.Types.ObjectId, ref: 'LedgerAccount' },
    supplierName: { type: String },
    supplierInvoiceNo: { type: String },
    cashAccountId: { type: Schema.Types.ObjectId, ref: 'LedgerAccount' },
    vatType: { type: String, enum: ['Vat', 'NonVat'], default: 'Vat' },
    taxMode: { type: String, enum: ['inclusive', 'exclusive'], default: 'inclusive' },
    narration: { type: String },
    items: { type: [PurchaseReturnItemSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
    itemsDiscount: { type: Number, default: 0 },
    otherDiscount: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    freightCharge: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

PurchaseReturnSchema.index({ companyId: 1, invoiceNo: 1 }, { unique: true });
PurchaseReturnSchema.index({ companyId: 1, financialYearId: 1, date: -1 });
PurchaseReturnSchema.index({ companyId: 1, returnType: 1, originalPurchaseId: 1 });

export const PurchaseReturn = mongoose.model<IPurchaseReturn>(
  'PurchaseReturn',
  PurchaseReturnSchema
);
