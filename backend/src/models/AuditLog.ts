import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'Create'
  | 'Update'
  | 'Delete'
  | 'Login'
  | 'Logout'
  | 'Backup'
  | 'Restore'
  | 'Import';

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  timestamp: Date;
  entityType: string;
  entityId?: string;
  action: AuditAction;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  details?: string;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    timestamp: { type: Date, default: Date.now },
    entityType: { type: String, required: true },
    entityId: { type: String },
    action: {
      type: String,
      enum: ['Create', 'Update', 'Delete', 'Login', 'Logout', 'Backup', 'Restore', 'Import'],
      required: true,
    },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    details: { type: String },
  },
  { timestamps: false }
);

AuditLogSchema.index({ companyId: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
