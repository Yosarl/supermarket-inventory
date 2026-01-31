import mongoose, { Document, Schema } from 'mongoose';

export type ProductStatus = 'active' | 'inactive';
export type VatCategory = 'standard' | 'zero' | 'exempt';

export interface IProduct extends Document {
  companyId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  internationalBarcode?: string;
  systemBarcode: string;
  categoryId?: mongoose.Types.ObjectId;
  defaultVendorId?: mongoose.Types.ObjectId;
  purchasePrice: number;
  sellingPrice: number;
  mrp?: number;
  vatCategory: VatCategory;
  unitOfMeasureId: mongoose.Types.ObjectId;
  minStockLevel?: number;
  reorderLevel?: number;
  batchTracking?: boolean;
  expiryTracking?: boolean;
  status: ProductStatus;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    internationalBarcode: { type: String },
    systemBarcode: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'ProductCategory' },
    defaultVendorId: { type: Schema.Types.ObjectId, ref: 'LedgerAccount' },
    purchasePrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    mrp: { type: Number },
    vatCategory: { type: String, enum: ['standard', 'zero', 'exempt'], default: 'standard' },
    unitOfMeasureId: { type: Schema.Types.ObjectId, ref: 'UnitOfMeasure', required: true },
    minStockLevel: { type: Number },
    reorderLevel: { type: Number },
    batchTracking: { type: Boolean, default: false },
    expiryTracking: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ProductSchema.index({ companyId: 1, name: 'text' });
ProductSchema.index({ companyId: 1, internationalBarcode: 1 }, { sparse: true });
ProductSchema.index({ companyId: 1, systemBarcode: 1 }, { unique: true });
ProductSchema.index({ companyId: 1, categoryId: 1 });
ProductSchema.index({ companyId: 1, defaultVendorId: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
