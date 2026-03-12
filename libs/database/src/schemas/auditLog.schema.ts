import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

export enum AuditCategoryEnum {
  AUTH = 'auth',
  DELIVERY = 'delivery',
  RIDER = 'rider',
  USER = 'user',
  FINANCE = 'finance',
  PRICING = 'pricing',
  DISPUTE = 'dispute',
  NOTIFICATION = 'notification',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

export enum AuditStatusEnum {
  SUCCESS = 'success',
  FAILURE = 'failure',
  WARNING = 'warning',
}

@Schema({
  collection: 'audit_logs',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class AuditLog extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Admin', required: false })
  admin?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: String, required: false })
  adminName?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  adminRole?: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  action: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: AuditCategoryEnum,
    required: true,
  })
  category: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  targetType?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  targetId?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  targetLabel?: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: AuditStatusEnum,
    default: AuditStatusEnum.SUCCESS,
  })
  status: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  ipAddress?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  userAgent?: string;

  @ApiProperty()
  @Prop({ type: Object, required: false })
  previousValue?: Record<string, any>;

  @ApiProperty()
  @Prop({ type: Object, required: false })
  newValue?: Record<string, any>;

  @ApiProperty()
  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
export type AuditLogDocument = AuditLog & Document;

AuditLogSchema.index({ admin: 1 });
AuditLogSchema.index({ category: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ status: 1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });
AuditLogSchema.index({ createdAt: -1 });
