import mongoose, { Document, Schema } from 'mongoose';

export type UserStatus = 'active' | 'locked';
export type Role = 'Admin' | 'Accountant' | 'Sales' | 'Inventory Manager' | 'POS Cashier';

export interface IUser extends Document {
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  roles: Role[];
  permissions: string[];
  companyAccess: mongoose.Types.ObjectId[];
  status: UserStatus;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    passwordHash: { type: String, required: true },
    roles: [{ type: String, enum: ['Admin', 'Accountant', 'Sales', 'Inventory Manager', 'POS Cashier'] }],
    permissions: [{ type: String }],
    companyAccess: [{ type: Schema.Types.ObjectId, ref: 'Company' }],
    status: { type: String, enum: ['active', 'locked'], default: 'active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ companyAccess: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
