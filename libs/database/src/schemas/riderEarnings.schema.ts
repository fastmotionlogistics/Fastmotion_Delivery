import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

export enum EarningsStatusEnum {
  PENDING = 'pending',
  AVAILABLE = 'available',
  WITHDRAWN = 'withdrawn',
  HELD = 'held',
}

export enum EarningsTypeEnum {
  DELIVERY_FEE = 'delivery_fee',
  TIP = 'tip',
  BONUS = 'bonus',
  REFERRAL = 'referral',
  ADJUSTMENT = 'adjustment',
}

@Schema({
  collection: 'rider_earnings',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class RiderEarnings extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Rider', required: true })
  rider: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'DeliveryRequest', required: false })
  deliveryRequest?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: String,
    enum: EarningsTypeEnum,
    required: true,
  })
  type: string;

  @ApiProperty()
  @Prop({ type: Number, required: true })
  amount: number;

  @ApiProperty()
  @Prop({ type: String, default: 'NGN' })
  currency: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: EarningsStatusEnum,
    default: EarningsStatusEnum.PENDING,
  })
  status: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  description?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  availableAt?: Date; // when the earnings become available for withdrawal

  @ApiProperty()
  @Prop({ type: Date, required: false })
  withdrawnAt?: Date;

  @ApiProperty()
  @Prop({ type: String, required: false })
  withdrawalReference?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RiderEarningsSchema = SchemaFactory.createForClass(RiderEarnings);
export type RiderEarningsDocument = RiderEarnings & Document;

// Indexes
RiderEarningsSchema.index({ rider: 1 });
RiderEarningsSchema.index({ deliveryRequest: 1 });
RiderEarningsSchema.index({ status: 1 });
RiderEarningsSchema.index({ type: 1 });
RiderEarningsSchema.index({ createdAt: -1 });
