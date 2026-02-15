import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchaseOrderBatch {
  productId: mongoose.Types.ObjectId;
  productCode: string;
  productName: string;
  batchNumber: string;
  purchasePrice: number;
  quantity: number;
  discAmount: number;
  expiryDate?: Date;
  retail: number;
  wholesale: number;
  specialPrice1: number;
  specialPrice2: number;
  multiUnitId?: string;
}

export interface IPurchaseOrder extends Document {
  companyId: mongoose.Types.ObjectId;
  financialYearId: mongoose.Types.ObjectId;
  invoiceNo: string;
  supplierInvoiceNo?: string;
  date: Date;
  supplierId?: mongoose.Types.ObjectId;
  supplierName?: string;
  vatType: 'Vat' | 'NonVat';
  narration?: string;
  batches: IPurchaseOrderBatch[];
  totalAmount: number;
  itemsDiscount: number;
  otherDiscount: number;
  otherCharges: number;
  freightCharge: number;
  roundOff: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderBatchSchema = new Schema<IPurchaseOrderBatch>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productCode: { type: String, default: '' },
    productName: { type: String, default: '' },
    batchNumber: { type: String, default: '' },
    purchasePrice: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    discAmount: { type: Number, default: 0 },
    expiryDate: { type: Date },
    retail: { type: Number, default: 0 },
    wholesale: { type: Number, default: 0 },
    specialPrice1: { type: Number, default: 0 },
    specialPrice2: { type: Number, default: 0 },
    multiUnitId: { type: String },
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    financialYearId: { type: Schema.Types.ObjectId, ref: 'FinancialYear', required: true },
    invoiceNo: { type: String, required: true },
    supplierInvoiceNo: { type: String },
    date: { type: Date, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'LedgerAccount' },
    supplierName: { type: String },
    vatType: { type: String, enum: ['Vat', 'NonVat'], default: 'Vat' },
    narration: { type: String },
    batches: { type: [PurchaseOrderBatchSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
    itemsDiscount: { type: Number, default: 0 },
    otherDiscount: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    freightCharge: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ companyId: 1, invoiceNo: 1 }, { unique: true });
PurchaseOrderSchema.index({ companyId: 1, date: -1 });
PurchaseOrderSchema.index({ companyId: 1, financialYearId: 1 });

export const PurchaseOrder = mongoose.model<IPurchaseOrder>(
  'PurchaseOrder',
  PurchaseOrderSchema
);
