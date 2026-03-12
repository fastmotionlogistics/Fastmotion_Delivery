import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

export enum WithdrawalStatusEnum {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({
  collection: 'withdrawal_requests',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class WithdrawalRequest extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Rider', required: true })
  rider: Types.ObjectId;

  @ApiProperty({ example: 5000 })
  @Prop({ type: Number, required: true })
  amount: number;

  @ApiProperty({ example: 'NGN' })
  @Prop({ type: String, default: 'NGN' })
  currency: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  bankName: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  bankCode?: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  bankAccountNumber: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  bankAccountName?: string;

  @ApiProperty()
  @Prop({ type: String, required: true, unique: true })
  reference: string;

  @ApiProperty({ enum: WithdrawalStatusEnum })
  @Prop({
    type: String,
    enum: WithdrawalStatusEnum,
    default: WithdrawalStatusEnum.PENDING,
  })
  status: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  adminNote?: string;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Admin', required: false })
  processedBy?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  processedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WithdrawalRequestSchema = SchemaFactory.createForClass(WithdrawalRequest);
export type WithdrawalRequestDocument = WithdrawalRequest & Document;

WithdrawalRequestSchema.index({ rider: 1, status: 1 });
WithdrawalRequestSchema.index({ status: 1 });
WithdrawalRequestSchema.index({ reference: 1 }, { unique: true });
WithdrawalRequestSchema.index({ createdAt: -1 });
