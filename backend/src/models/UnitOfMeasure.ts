import mongoose, { Document, Schema } from 'mongoose';

export interface IUnitOfMeasure extends Document {
  companyId?: mongoose.Types.ObjectId; // Optional - for backward compatibility
  name: string;
  shortCode: string;
  isGlobal: boolean; // True for global units shared across all companies
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const UnitOfMeasureSchema = new Schema<IUnitOfMeasure>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' }, // Optional for global units
    name: { type: String, required: true },
    shortCode: { type: String, required: true },
    isGlobal: { type: Boolean, default: true }, // Default to global
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Global unique index on name (case-insensitive)
UnitOfMeasureSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
// Global unique index on shortCode (case-insensitive)
UnitOfMeasureSchema.index({ shortCode: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const UnitOfMeasure = mongoose.model<IUnitOfMeasure>('UnitOfMeasure', UnitOfMeasureSchema);
