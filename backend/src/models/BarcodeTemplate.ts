import mongoose, { Document, Schema } from 'mongoose';

export interface IBarcodeTemplate extends Document {
  companyId: mongoose.Types.ObjectId;
  name: string;
  labelWidth: number;
  labelHeight: number;
  pageLayout?: string;
  fields: Array<{ key: string; label: string; visible: boolean }>;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const BarcodeTemplateSchema = new Schema<IBarcodeTemplate>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    labelWidth: { type: Number, default: 50 },
    labelHeight: { type: Number, default: 25 },
    pageLayout: { type: String },
    fields: [
      {
        key: String,
        label: String,
        visible: { type: Boolean, default: true },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

BarcodeTemplateSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const BarcodeTemplate = mongoose.model<IBarcodeTemplate>('BarcodeTemplate', BarcodeTemplateSchema);
