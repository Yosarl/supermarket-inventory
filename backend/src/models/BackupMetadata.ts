import mongoose, { Document, Schema } from 'mongoose';

export interface IBackupMetadata extends Document {
  performedBy: mongoose.Types.ObjectId;
  performedAt: Date;
  filePath?: string;
  fileName?: string;
  sizeBytes?: number;
  details?: string;
}

const BackupMetadataSchema = new Schema<IBackupMetadata>(
  {
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedAt: { type: Date, default: Date.now },
    filePath: { type: String },
    fileName: { type: String },
    sizeBytes: { type: Number },
    details: { type: String },
  },
  { timestamps: false }
);

BackupMetadataSchema.index({ performedAt: -1 });

export const BackupMetadata = mongoose.model<IBackupMetadata>('BackupMetadata', BackupMetadataSchema);
