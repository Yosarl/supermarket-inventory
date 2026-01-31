import mongoose, { Document, Schema } from 'mongoose';

export interface ISalesInvoiceItem extends Document {
  invoiceId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  costPriceAtSale: number;
}

const SalesInvoiceItemSchema = new Schema<ISalesInvoiceItem>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: 'SalesInvoice', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    description: { type: String },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    vatRate: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    costPriceAtSale: { type: Number, default: 0 },
  },
  { _id: true }
);

export const SalesInvoiceItem = mongoose.model<ISalesInvoiceItem>('SalesInvoiceItem', SalesInvoiceItemSchema);
