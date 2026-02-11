import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletDocument = Wallet & Document;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },

  toObject: { virtuals: true, versionKey: false },
})
export class Wallet {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ type: String, required: true })
  currency: string; // NGN, USD, GHS, etc.

  @Prop({ type: String, required: true })
  currencySymbol: string; // ₦, $, ₵, etc.

  @Prop({ type: Number, default: 0, min: 0 })
  depositBalance: number; // In local currency

  @Prop({ type: Number, default: 0, min: 0 })
  withdrawableBalance: number; // In local currency

  @Prop({ type: Number, default: 0, min: 0 })
  totalBalance: number; // depositBalance + withdrawableBalance in local currency

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isLocked: boolean;

  @Prop({ type: Date })
  lastTransactionDate?: Date;

  @Prop({ type: Number, default: 0 })
  totalDeposited: number; // Lifetime deposits in local currency

  @Prop({ type: Number, default: 0 })
  totalWithdrawn: number; // Lifetime withdrawals in local currency

  @Prop({ type: Number, default: 0 })
  totalWinnings: number; // Lifetime winnings in local currency

  createdAt?: Date;
  updatedAt?: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

// Add indexes
WalletSchema.index({ user: 1 });
WalletSchema.index({ isActive: 1 });
WalletSchema.index({ currency: 1 });

// Pre-save hook to update total balance
WalletSchema.pre('save', function (next) {
  this.totalBalance = this.depositBalance + this.withdrawableBalance;
  next();
});
