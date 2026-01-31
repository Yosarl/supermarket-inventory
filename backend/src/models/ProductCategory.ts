import mongoose, { Document, Schema } from 'mongoose';

export interface IProductCategory extends Document {
  companyId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  parentCategoryId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const ProductCategorySchema = new Schema<IProductCategory>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    parentCategoryId: { type: Schema.Types.ObjectId, ref: 'ProductCategory' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ProductCategorySchema.index({ companyId: 1, code: 1 }, { unique: true });

export const ProductCategory = mongoose.model<IProductCategory>('ProductCategory', ProductCategorySchema);
