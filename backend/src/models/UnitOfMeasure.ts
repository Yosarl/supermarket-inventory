import mongoose, { Document, Schema } from 'mongoose';

export interface IUnitOfMeasure extends Document {
  companyId: mongoose.Types.ObjectId;
  name: string;
  shortCode: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const UnitOfMeasureSchema = new Schema<IUnitOfMeasure>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    shortCode: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

UnitOfMeasureSchema.index({ companyId: 1, shortCode: 1 }, { unique: true });

export const UnitOfMeasure = mongoose.model<IUnitOfMeasure>('UnitOfMeasure', UnitOfMeasureSchema);
