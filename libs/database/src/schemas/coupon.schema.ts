import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';
import { CouponStatusEnum, CouponTypeEnum } from '../../../common/src/enums/delivery.enum';

@Schema({
  collection: 'coupons',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class Coupon extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: String, required: true, unique: true, uppercase: true })
  code: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  description?: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: CouponTypeEnum,
    required: true,
  })
  type: string;

  @ApiProperty()
  @Prop({ type: Number, required: true })
  value: number; // percentage or fixed amount

  @ApiProperty()
  @Prop({ type: Number, required: false })
  maxDiscountAmount?: number; // maximum discount for percentage coupons

  @ApiProperty()
  @Prop({ type: Number, required: false })
  minOrderAmount?: number; // minimum order value to apply coupon

  @ApiProperty()
  @Prop({
    type: String,
    enum: CouponStatusEnum,
    default: CouponStatusEnum.ACTIVE,
  })
  status: string;

  @ApiProperty()
  @Prop({ type: Date, required: true })
  validFrom: Date;

  @ApiProperty()
  @Prop({ type: Date, required: true })
  validUntil: Date;

  @ApiProperty()
  @Prop({ type: Number, required: false })
  usageLimit?: number; // total number of times coupon can be used

  @ApiProperty()
  @Prop({ type: Number, default: 0 })
  usageCount: number; // current usage count

  @ApiProperty()
  @Prop({ type: Number, default: 1 })
  usageLimitPerUser: number; // times each user can use the coupon

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isFirstOrderOnly: boolean; // only for first-time users

  @ApiProperty()
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  applicableUsers: Types.ObjectId[]; // specific users (empty means all users)

  @ApiProperty()
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  usedBy: Types.ObjectId[]; // users who have used this coupon

  @ApiProperty()
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
export type CouponDocument = Coupon & Document;

// Indexes
CouponSchema.index({ code: 1 });
CouponSchema.index({ status: 1 });
CouponSchema.index({ validFrom: 1, validUntil: 1 });
CouponSchema.index({ isActive: 1 });
