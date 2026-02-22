import mongoose, { Document, Schema } from 'mongoose';

export interface IBatchSequence extends Document {
  companyId: mongoose.Types.ObjectId;
  lastValue: number;
}

const BatchSequenceSchema = new Schema<IBatchSequence>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
    lastValue: { type: Number, default: 0 },
  },
  { timestamps: false }
);

export const BatchSequence = mongoose.model<IBatchSequence>('BatchSequence', BatchSequenceSchema);
