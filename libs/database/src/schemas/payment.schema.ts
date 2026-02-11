import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';
import {
  DeliveryPaymentStatusEnum,
  DeliveryPaymentMethodEnum,
} from '../../../common/src/enums/delivery.enum';

@Schema({
  collection: 'payments',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class Payment extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: String, required: true, unique: true })
  reference: string;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'DeliveryRequest', required: false })
  deliveryRequest?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Number, required: true })
  amount: number;

  @ApiProperty()
  @Prop({ type: String, default: 'NGN' })
  currency: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: DeliveryPaymentMethodEnum,
    required: true,
  })
  paymentMethod: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: DeliveryPaymentStatusEnum,
    default: DeliveryPaymentStatusEnum.PENDING,
  })
  status: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  provider?: string; // e.g., 'paystack', 'flutterwave'

  @ApiProperty()
  @Prop({ type: String, required: false })
  providerReference?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  providerResponse?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  paidAt?: Date;

  @ApiProperty()
  @Prop({ type: String, required: false })
  description?: string;

  // For refunds
  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isRefund: boolean;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Payment', required: false })
  originalPayment?: Types.ObjectId; // reference to original payment if this is a refund

  @ApiProperty()
  @Prop({ type: Number, required: false })
  refundedAmount?: number;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  refundedAt?: Date;

  @ApiProperty()
  @Prop({ type: String, required: false })
  refundReason?: string;

  // Metadata
  @ApiProperty()
  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
export type PaymentDocument = Payment & Document;

// Indexes
PaymentSchema.index({ reference: 1 });
PaymentSchema.index({ user: 1 });
PaymentSchema.index({ deliveryRequest: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ providerReference: 1 });
