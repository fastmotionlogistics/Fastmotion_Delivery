import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

export enum PlatformEarningTypeEnum {
  DELIVERY_COMMISSION = 'delivery_commission',
  REFUND_DEDUCTION = 'refund_deduction',
}

export enum PlatformEarningStatusEnum {
  EARNED = 'earned',
  REFUNDED = 'refunded',
}

@Schema({
  collection: 'platform_earnings',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class PlatformEarning extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'DeliveryRequest', required: true })
  deliveryRequest: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Rider', required: false })
  rider?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  customer?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: String,
    enum: PlatformEarningTypeEnum,
    required: true,
  })
  type: string;

  @ApiProperty({ description: 'Total delivery price' })
  @Prop({ type: Number, required: true })
  totalDeliveryPrice: number;

  @ApiProperty({ description: 'Amount paid to rider' })
  @Prop({ type: Number, required: true })
  riderPayout: number;

  @ApiProperty({ description: 'Platform commission amount' })
  @Prop({ type: Number, required: true })
  platformCommission: number;

  @ApiProperty({ description: 'Commission rate applied (e.g. 0.20 = 20%)' })
  @Prop({ type: Number, required: true })
  commissionRate: number;

  @ApiProperty({ description: 'Service fee charged to customer' })
  @Prop({ type: Number, default: 0 })
  serviceFee: number;

  @ApiProperty()
  @Prop({
    type: String,
    enum: PlatformEarningStatusEnum,
    default: PlatformEarningStatusEnum.EARNED,
  })
  status: string;

  @ApiProperty()
  @Prop({ type: String, default: 'NGN' })
  currency: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  description?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  trackingNumber?: string;

  @ApiProperty()
  @Prop({ type: Number, required: false })
  refundedAmount?: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PlatformEarningSchema = SchemaFactory.createForClass(PlatformEarning);
export type PlatformEarningDocument = PlatformEarning & Document;

PlatformEarningSchema.index({ deliveryRequest: 1 });
PlatformEarningSchema.index({ type: 1 });
PlatformEarningSchema.index({ status: 1 });
PlatformEarningSchema.index({ createdAt: -1 });
