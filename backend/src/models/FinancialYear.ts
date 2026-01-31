import mongoose, { Document, Schema } from 'mongoose';

export type FinancialYearStatus = 'open' | 'closed';

export interface IFinancialYear extends Document {
  companyId: mongoose.Types.ObjectId;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  status: FinancialYearStatus;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const FinancialYearSchema = new Schema<IFinancialYear>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

FinancialYearSchema.index({ companyId: 1 });
FinancialYearSchema.index({ companyId: 1, isCurrent: 1 });

export const FinancialYear = mongoose.model<IFinancialYear>('FinancialYear', FinancialYearSchema);
