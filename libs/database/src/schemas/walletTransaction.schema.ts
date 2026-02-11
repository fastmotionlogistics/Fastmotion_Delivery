import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TransactionType, TransactionStatus } from '../../../common/src/enums';

export enum TransactionCategory {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  REFUND = 'REFUND',
  BAKERY_ORDER_DEPOSIT = 'BAKERY_ORDER_DEPOSIT',
  BAKERY_ORDER_WITHDRAWAL = 'BAKERY_ORDER_WITHDRAWAL',
  ADJUSTMENT = 'ADJUSTMENT',
  ORDER_PAYMENT = 'ORDER_PAYMENT',
  DELIVERY_FEE = 'DELIVERY_FEE',
}

export enum BalanceType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWABLE = 'WITHDRAWABLE',
  BOTH = 'BOTH', // For transactions affecting both balances
}

export type WalletTransactionDocument = WalletTransaction & Document;

@Schema({
  collection: 'walletTransaction',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class WalletTransaction {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  transactionRef: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Wallet', required: true })
  wallet: Types.ObjectId;

  @Prop({ type: String, enum: TransactionType, required: true })
  type: TransactionType;

  @Prop({ type: String, enum: TransactionCategory, required: true })
  category: TransactionCategory;

  @Prop({ type: String, enum: BalanceType, required: true })
  balanceType: BalanceType;

  @Prop({ type: String, enum: TransactionStatus, required: true })
  status: TransactionStatus;

  @Prop({ type: Number, required: true })
  amount: number; // Amount in the wallet's currency

  // @Prop({ type: String, required: true })
  // currency: string; // NGN, USD, GHS, etc.

  // @Prop({ type: String, required: true })
  // currencySymbol: string; // ₦, $, ₵, etc.

  // Balance tracking for both types
  @Prop({ type: Number, required: true })
  depositBalanceBefore: number;

  @Prop({ type: Number, required: true })
  depositBalanceAfter: number;

  @Prop({ type: Number, required: true })
  withdrawableBalanceBefore: number;

  @Prop({ type: Number, required: true })
  withdrawableBalanceAfter: number;

  @Prop({ type: Number, required: true })
  totalBalanceBefore: number;

  @Prop({ type: Number, required: true })
  totalBalanceAfter: number;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String })
  reference?: string;

  @Prop({ type: Number, default: 0 })
  platformFee?: number;

  @Prop({ type: Number })
  netAmount?: number;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Date })
  reversedAt?: Date;

  @Prop({ type: String })
  failureReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'WalletTransaction' })
  reversalOf?: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: String })
  paymentMethod?: string;

  @Prop({ type: String })
  paymentProvider?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);

// Add indexes
WalletTransactionSchema.index({ user: 1, createdAt: -1 });
WalletTransactionSchema.index({ transactionRef: 1 });
WalletTransactionSchema.index({ status: 1 });
WalletTransactionSchema.index({ category: 1 });
WalletTransactionSchema.index({ type: 1 });
WalletTransactionSchema.index({ balanceType: 1 });
WalletTransactionSchema.index({ currency: 1 });
