import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery, ClientSession } from 'mongoose';
import {
  Payment,
  PaymentDocument,
  Wallet,
  WalletDocument,
  WalletTransaction,
  WalletTransactionDocument,
  DeliveryRequest,
  DeliveryRequestDocument,
} from '@libs/database';
import { TransactionType, TransactionStatus } from '@libs/common';
import {
  TransactionCategory,
  BalanceType,
} from '@libs/database/schemas/walletTransaction.schema';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectModel(Payment.name)
    readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Wallet.name)
    readonly walletModel: Model<WalletDocument>,
    @InjectModel(WalletTransaction.name)
    readonly walletTransactionModel: Model<WalletTransactionDocument>,
    @InjectModel(DeliveryRequest.name)
    readonly deliveryModel: Model<DeliveryRequestDocument>,
  ) {}

  // Payment methods
  async createPayment(data: Partial<Payment>): Promise<Payment> {
    const payment = new this.paymentModel({
      ...data,
      _id: new Types.ObjectId(),
    });
    return payment.save();
  }

  async findPaymentById(id: string | Types.ObjectId): Promise<Payment | null> {
    return this.paymentModel.findById(id).lean();
  }

  async findPaymentByReference(reference: string): Promise<Payment | null> {
    return this.paymentModel.findOne({ reference }).lean();
  }

  async findPaymentsByUser(
    userId: Types.ObjectId,
    filters: { status?: string; page?: number; limit?: number } = {},
  ): Promise<{ data: Payment[]; total: number }> {
    const { status, page = 1, limit = 20 } = filters;
    const query: FilterQuery<Payment> = { user: userId };

    if (status) {
      query.status = status;
    }

    const [data, total] = await Promise.all([
      this.paymentModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('deliveryRequest', 'trackingNumber status')
        .lean(),
      this.paymentModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async findPaymentByDelivery(
    deliveryId: Types.ObjectId,
  ): Promise<Payment | null> {
    return this.paymentModel
      .findOne({ deliveryRequest: deliveryId, isRefund: false })
      .lean();
  }

  async updatePayment(
    id: string | Types.ObjectId,
    update: Partial<Payment>,
  ): Promise<Payment | null> {
    return this.paymentModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .lean();
  }

  async updatePaymentByReference(
    reference: string,
    update: Partial<Payment>,
  ): Promise<Payment | null> {
    return this.paymentModel
      .findOneAndUpdate({ reference }, { $set: update }, { new: true })
      .lean();
  }

  // Wallet methods
  async findWalletByUser(userId: Types.ObjectId): Promise<Wallet | null> {
    return this.walletModel.findOne({ user: userId }).lean();
  }

  async createWallet(userId: Types.ObjectId): Promise<Wallet> {
    const wallet = new this.walletModel({
      _id: new Types.ObjectId(),
      user: userId,
      currency: 'NGN',
      currencySymbol: '₦',
      depositBalance: 0,
      withdrawableBalance: 0,
      totalBalance: 0,
      isActive: true,
      isLocked: false,
    });
    return wallet.save();
  }

  async getOrCreateWallet(userId: Types.ObjectId): Promise<Wallet> {
    let wallet = await this.findWalletByUser(userId);
    if (!wallet) {
      wallet = await this.createWallet(userId);
    }
    return wallet;
  }

  async updateWalletBalance(
    walletId: Types.ObjectId,
    depositDelta: number,
    withdrawableDelta: number,
    session?: ClientSession,
  ): Promise<Wallet | null> {
    const update: any = {
      $inc: {
        depositBalance: depositDelta,
        withdrawableBalance: withdrawableDelta,
        totalBalance: depositDelta + withdrawableDelta,
      },
      $set: { lastTransactionDate: new Date() },
    };

    if (depositDelta > 0) {
      update.$inc.totalDeposited = depositDelta;
    }
    if (withdrawableDelta < 0) {
      update.$inc.totalWithdrawn = Math.abs(withdrawableDelta);
    }

    const options = session ? { new: true, session } : { new: true };
    return this.walletModel.findByIdAndUpdate(walletId, update, options).lean();
  }

  async lockWallet(walletId: Types.ObjectId): Promise<Wallet | null> {
    return this.walletModel
      .findByIdAndUpdate(walletId, { $set: { isLocked: true } }, { new: true })
      .lean();
  }

  async unlockWallet(walletId: Types.ObjectId): Promise<Wallet | null> {
    return this.walletModel
      .findByIdAndUpdate(walletId, { $set: { isLocked: false } }, { new: true })
      .lean();
  }

  // Wallet transaction methods
  async createWalletTransaction(
    data: Partial<WalletTransaction>,
  ): Promise<WalletTransaction> {
    const transaction = new this.walletTransactionModel({
      ...data,
      _id: new Types.ObjectId(),
    });
    return transaction.save();
  }

  async findWalletTransactionById(
    id: string | Types.ObjectId,
  ): Promise<WalletTransaction | null> {
    return this.walletTransactionModel.findById(id).lean();
  }

  async findWalletTransactionByRef(
    transactionRef: string,
  ): Promise<WalletTransaction | null> {
    return this.walletTransactionModel.findOne({ transactionRef }).lean();
  }

  async findWalletTransactions(
    userId: Types.ObjectId,
    filters: {
      type?: string;
      category?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: WalletTransaction[]; total: number }> {
    const { type, category, page = 1, limit = 20 } = filters;
    const query: FilterQuery<WalletTransaction> = { user: userId };

    if (type) {
      query.type = type;
    }
    if (category) {
      query.category = category;
    }

    const [data, total] = await Promise.all([
      this.walletTransactionModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.walletTransactionModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async updateWalletTransactionStatus(
    id: string | Types.ObjectId,
    status: TransactionStatus,
    additionalFields: Partial<WalletTransaction> = {},
  ): Promise<WalletTransaction | null> {
    return this.walletTransactionModel
      .findByIdAndUpdate(
        id,
        { $set: { status, ...additionalFields } },
        { new: true },
      )
      .lean();
  }

  // Delivery methods
  async findDeliveryById(
    id: string | Types.ObjectId,
  ): Promise<DeliveryRequest | null> {
    return this.deliveryModel.findById(id).lean();
  }

  async updateDeliveryPaymentStatus(
    id: string | Types.ObjectId,
    paymentStatus: string,
    paymentId?: Types.ObjectId,
  ): Promise<DeliveryRequest | null> {
    const update: any = { paymentStatus };
    if (paymentId) {
      update.payment = paymentId;
    }
    return this.deliveryModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .lean();
  }

  // Helper methods
  generatePaymentReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAY_${timestamp}${random}`;
  }

  generateTransactionRef(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TXN_${timestamp}${random}`;
  }

  // Complex transaction with session
  async processWalletPayment(
    wallet: Wallet,
    amount: number,
    description: string,
    category: TransactionCategory,
    metadata?: Record<string, any>,
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    const session = await this.walletModel.startSession();
    session.startTransaction();

    try {
      const transactionRef = this.generateTransactionRef();

      // Create wallet transaction record
      const transactionData: Partial<WalletTransaction> = {
        transactionRef,
        user: wallet.user,
        wallet: wallet._id,
        type: TransactionType.DEBIT,
        category,
        balanceType: BalanceType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        amount,
        depositBalanceBefore: wallet.depositBalance,
        depositBalanceAfter: wallet.depositBalance - amount,
        withdrawableBalanceBefore: wallet.withdrawableBalance,
        withdrawableBalanceAfter: wallet.withdrawableBalance,
        totalBalanceBefore: wallet.totalBalance,
        totalBalanceAfter: wallet.totalBalance - amount,
        description,
        completedAt: new Date(),
        metadata,
      };

      const transaction = await this.createWalletTransaction(transactionData);

      // Update wallet balance
      const updatedWallet = await this.updateWalletBalance(
        wallet._id,
        -amount,
        0,
        session,
      );

      await session.commitTransaction();

      return { wallet: updatedWallet!, transaction };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async processWalletFunding(
    wallet: Wallet,
    amount: number,
    description: string,
    paymentReference: string,
    metadata?: Record<string, any>,
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    // Re-read wallet to get fresh balances (avoid stale .lean() snapshot)
    const freshWallet = await this.walletModel.findById(wallet._id).lean();
    if (!freshWallet) throw new Error('Wallet not found during funding');

    const transactionRef = this.generateTransactionRef();

    // 1. Update wallet balance first (atomic $inc, no session needed)
    const updatedWallet = await this.walletModel.findByIdAndUpdate(
      freshWallet._id,
      {
        $inc: {
          depositBalance: amount,
          totalBalance: amount,
          totalDeposited: amount,
        },
        $set: { lastTransactionDate: new Date() },
      },
      { new: true },
    ).lean();

    // 2. Create wallet transaction record with accurate before/after
    const transactionData: Partial<WalletTransaction> = {
      transactionRef,
      user: freshWallet.user,
      wallet: freshWallet._id,
      type: TransactionType.CREDIT,
      category: TransactionCategory.DEPOSIT,
      balanceType: BalanceType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      amount,
      depositBalanceBefore: freshWallet.depositBalance,
      depositBalanceAfter: freshWallet.depositBalance + amount,
      withdrawableBalanceBefore: freshWallet.withdrawableBalance,
      withdrawableBalanceAfter: freshWallet.withdrawableBalance,
      totalBalanceBefore: freshWallet.totalBalance,
      totalBalanceAfter: freshWallet.totalBalance + amount,
      description,
      reference: paymentReference,
      completedAt: new Date(),
      metadata,
    };

    const transaction = await this.createWalletTransaction(transactionData);

    return { wallet: updatedWallet!, transaction };
  }

  async processRefund(
    wallet: Wallet,
    amount: number,
    description: string,
    originalPaymentRef: string,
    metadata?: Record<string, any>,
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    const session = await this.walletModel.startSession();
    session.startTransaction();

    try {
      const transactionRef = this.generateTransactionRef();

      // Create wallet transaction record for refund
      const transactionData: Partial<WalletTransaction> = {
        transactionRef,
        user: wallet.user,
        wallet: wallet._id,
        type: TransactionType.CREDIT,
        category: TransactionCategory.REFUND,
        balanceType: BalanceType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        amount,
        depositBalanceBefore: wallet.depositBalance,
        depositBalanceAfter: wallet.depositBalance + amount,
        withdrawableBalanceBefore: wallet.withdrawableBalance,
        withdrawableBalanceAfter: wallet.withdrawableBalance,
        totalBalanceBefore: wallet.totalBalance,
        totalBalanceAfter: wallet.totalBalance + amount,
        description,
        reference: originalPaymentRef,
        completedAt: new Date(),
        metadata,
      };

      const transaction = await this.createWalletTransaction(transactionData);

      // Update wallet balance
      const updatedWallet = await this.updateWalletBalance(
        wallet._id,
        amount,
        0,
        session,
      );

      await session.commitTransaction();

      return { wallet: updatedWallet!, transaction };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
