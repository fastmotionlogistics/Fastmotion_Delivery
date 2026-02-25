import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

// ── Admin Roles ─────────────────────────────────────────────
export enum AdminRoleEnum {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  OPERATIONS_MANAGER = 'operations_manager',
  FLEET_MANAGER = 'fleet_manager',
  SUPPORT_AGENT = 'support_agent',
  FINANCE_MANAGER = 'finance_manager',
}

// ── Permission Groups ───────────────────────────────────────
export enum AdminPermissionEnum {
  // Delivery management
  DELIVERY_VIEW = 'delivery:view',
  DELIVERY_MANAGE = 'delivery:manage',
  DELIVERY_CANCEL = 'delivery:cancel',
  DELIVERY_OVERRIDE_PIN = 'delivery:override_pin',

  // Rider management
  RIDER_VIEW = 'rider:view',
  RIDER_CREATE = 'rider:create',
  RIDER_EDIT = 'rider:edit',
  RIDER_SUSPEND = 'rider:suspend',
  RIDER_VERIFY = 'rider:verify',
  RIDER_ASSIGN_DELIVERY = 'rider:assign_delivery',

  // User management
  USER_VIEW = 'user:view',
  USER_EDIT = 'user:edit',
  USER_SUSPEND = 'user:suspend',

  // Financial
  FINANCE_VIEW = 'finance:view',
  FINANCE_REFUND = 'finance:refund',
  FINANCE_PRICE_ADJUST = 'finance:price_adjust',
  FINANCE_EARNINGS = 'finance:earnings',

  // Pricing configuration
  PRICING_VIEW = 'pricing:view',
  PRICING_MANAGE = 'pricing:manage',

  // Disputes
  DISPUTE_VIEW = 'dispute:view',
  DISPUTE_MANAGE = 'dispute:manage',

  // Admin management (super admin only)
  ADMIN_VIEW = 'admin:view',
  ADMIN_CREATE = 'admin:create',
  ADMIN_EDIT = 'admin:edit',
  ADMIN_DELETE = 'admin:delete',

  // Reports
  REPORT_VIEW = 'report:view',
  REPORT_EXPORT = 'report:export',

  // Settings
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_MANAGE = 'settings:manage',
}

// ── Default permissions per role ────────────────────────────
export const ROLE_PERMISSIONS: Record<AdminRoleEnum, AdminPermissionEnum[]> = {
  [AdminRoleEnum.SUPER_ADMIN]: Object.values(AdminPermissionEnum), // All permissions

  [AdminRoleEnum.ADMIN]: [
    AdminPermissionEnum.DELIVERY_VIEW, AdminPermissionEnum.DELIVERY_MANAGE, AdminPermissionEnum.DELIVERY_CANCEL,
    AdminPermissionEnum.DELIVERY_OVERRIDE_PIN,
    AdminPermissionEnum.RIDER_VIEW, AdminPermissionEnum.RIDER_CREATE, AdminPermissionEnum.RIDER_EDIT,
    AdminPermissionEnum.RIDER_SUSPEND, AdminPermissionEnum.RIDER_VERIFY, AdminPermissionEnum.RIDER_ASSIGN_DELIVERY,
    AdminPermissionEnum.USER_VIEW, AdminPermissionEnum.USER_EDIT, AdminPermissionEnum.USER_SUSPEND,
    AdminPermissionEnum.FINANCE_VIEW, AdminPermissionEnum.FINANCE_REFUND, AdminPermissionEnum.FINANCE_PRICE_ADJUST,
    AdminPermissionEnum.PRICING_VIEW, AdminPermissionEnum.PRICING_MANAGE,
    AdminPermissionEnum.DISPUTE_VIEW, AdminPermissionEnum.DISPUTE_MANAGE,
    AdminPermissionEnum.REPORT_VIEW, AdminPermissionEnum.REPORT_EXPORT,
    AdminPermissionEnum.SETTINGS_VIEW,
  ],

  [AdminRoleEnum.OPERATIONS_MANAGER]: [
    AdminPermissionEnum.DELIVERY_VIEW, AdminPermissionEnum.DELIVERY_MANAGE, AdminPermissionEnum.DELIVERY_CANCEL,
    AdminPermissionEnum.RIDER_VIEW, AdminPermissionEnum.RIDER_ASSIGN_DELIVERY,
    AdminPermissionEnum.USER_VIEW,
    AdminPermissionEnum.DISPUTE_VIEW, AdminPermissionEnum.DISPUTE_MANAGE,
    AdminPermissionEnum.REPORT_VIEW,
  ],

  [AdminRoleEnum.FLEET_MANAGER]: [
    AdminPermissionEnum.RIDER_VIEW, AdminPermissionEnum.RIDER_CREATE, AdminPermissionEnum.RIDER_EDIT,
    AdminPermissionEnum.RIDER_SUSPEND, AdminPermissionEnum.RIDER_VERIFY, AdminPermissionEnum.RIDER_ASSIGN_DELIVERY,
    AdminPermissionEnum.DELIVERY_VIEW, AdminPermissionEnum.DELIVERY_MANAGE,
    AdminPermissionEnum.REPORT_VIEW,
  ],

  [AdminRoleEnum.SUPPORT_AGENT]: [
    AdminPermissionEnum.DELIVERY_VIEW, AdminPermissionEnum.DELIVERY_OVERRIDE_PIN,
    AdminPermissionEnum.RIDER_VIEW,
    AdminPermissionEnum.USER_VIEW,
    AdminPermissionEnum.DISPUTE_VIEW, AdminPermissionEnum.DISPUTE_MANAGE,
    AdminPermissionEnum.FINANCE_VIEW, AdminPermissionEnum.FINANCE_REFUND,
  ],

  [AdminRoleEnum.FINANCE_MANAGER]: [
    AdminPermissionEnum.FINANCE_VIEW, AdminPermissionEnum.FINANCE_REFUND, AdminPermissionEnum.FINANCE_PRICE_ADJUST,
    AdminPermissionEnum.FINANCE_EARNINGS,
    AdminPermissionEnum.PRICING_VIEW, AdminPermissionEnum.PRICING_MANAGE,
    AdminPermissionEnum.DELIVERY_VIEW,
    AdminPermissionEnum.REPORT_VIEW, AdminPermissionEnum.REPORT_EXPORT,
  ],
};

// ── Schema ──────────────────────────────────────────────────
@Schema({
  collection: 'admins',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class Admin extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: String, required: true, maxlength: 64 })
  firstName: string;

  @ApiProperty()
  @Prop({ type: String, required: true, maxlength: 64 })
  lastName: string;

  @ApiProperty()
  @Prop({ type: String, required: true, unique: true, maxlength: 128 })
  email: string;

  @ApiProperty()
  @Prop({ type: String, required: false, maxlength: 20 })
  phone?: string;

  @ApiProperty()
  @Prop({ type: String, required: true, select: false })
  passwordHash: string;

  @ApiProperty()
  @Prop({ type: String, required: true, select: false })
  passwordSalt: string;

  @ApiProperty()
  @Prop({ type: String, enum: AdminRoleEnum, required: true })
  role: string;

  @ApiProperty()
  @Prop({ type: [String], enum: AdminPermissionEnum, default: [] })
  permissions: string[];

  @ApiProperty()
  @Prop({ type: String, required: false })
  profilePhoto?: string;

  @ApiProperty()
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isEmailConfirmed: boolean;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  mustChangePassword: boolean;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  lastLoginDate?: Date;

  @ApiProperty()
  @Prop({ type: String, required: false })
  lastLoginIp?: string;

  @ApiProperty()
  @Prop({ type: Number, default: 0 })
  loginFailedCount: number;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  lockedUntil?: Date;

  @ApiProperty()
  @Prop({ type: String, required: false, select: false })
  resetPasswordOtp?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false, select: false })
  resetPasswordOtpExpiry?: Date;

  @ApiProperty({ description: 'Admin who created this account' })
  @Prop({ type: Types.ObjectId, ref: 'Admin', required: false })
  createdBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
export type AdminDocument = Admin & Document;

AdminSchema.index({ email: 1 });
AdminSchema.index({ role: 1 });
AdminSchema.index({ isActive: 1 });
