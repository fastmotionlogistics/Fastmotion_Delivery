/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { TransactionCategory, BalanceType, WalletTransaction } from '@libs/database';
import { GetTransactionsDto, TransactionReportFiltersDto } from './dto';
import {
  MONNIFY_CONSTANTS,
  MonnifyTransactionDto,
  timeZoneMoment,
  generateRandomString,
  TransactionType,
  TransactionStatus,
  MTransactionStatus,
} from '@libs/common';
import { WalletRepository } from './repository/wallet.repository';

interface CreateTransactionData {
  userId: string;
  walletId: string;
  type: TransactionType;
  category: TransactionCategory;
  balanceType: BalanceType;
  amount: number;
  // currency: string;
  // currencySymbol: string;
  depositBalanceBefore: number;
  depositBalanceAfter: number;
  withdrawableBalanceBefore: number;
  withdrawableBalanceAfter: number;
  totalBalanceBefore: number;
  totalBalanceAfter: number;
  description: string;
  reference?: string;
  metadata?: Record<string, any>;
  status: TransactionStatus;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectModel('WalletTransaction')
    private readonly transactionModel: Model<WalletTransaction>,
    private readonly walletRepository: WalletRepository,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new transaction record
   */
  async createTransaction(data: CreateTransactionData): Promise<WalletTransaction> {
    // Generate unique transaction reference
    const transactionRef = this.generateTransactionRef(data.type, data.category);

    // Calculate platform fee if applicable
    let platformFee = 0;
    let netAmount = data.amount;

    // if (data.category === TransactionCategory.CONTEST_ENTRY && data.metadata?.commission) {
    //   platformFee = data.metadata.commission;
    //   netAmount = data.amount - platformFee;
    // }

    const transaction = new this.transactionModel({
      _id: new Types.ObjectId(),
      transactionRef,
      user: new Types.ObjectId(data.userId),
      wallet: new Types.ObjectId(data.walletId),
      type: data.type,
      status: data.status,
      category: data.category,
      balanceType: data.balanceType,
      amount: data.amount,
      // currency: data.currency,
      // currencySymbol: data.currencySymbol,
      depositBalanceBefore: data.depositBalanceBefore,
      depositBalanceAfter: data.depositBalanceAfter,
      withdrawableBalanceBefore: data.withdrawableBalanceBefore,
      withdrawableBalanceAfter: data.withdrawableBalanceAfter,
      totalBalanceBefore: data.totalBalanceBefore,
      totalBalanceAfter: data.totalBalanceAfter,
      description: data.description,
      reference: data.reference,
      metadata: data.metadata,
      platformFee,
      netAmount,
      completedAt: data.status === TransactionStatus.COMPLETED ? new Date() : undefined,
    });

    await transaction.save();

    this.logger.log(
      `Created ${data.type} transaction ${transactionRef} for ${'NGN'}${data.amount} on ${data.balanceType} balance`,
    );

    return transaction;
  }

  /**
   * Get user transactions with filters
   */
  async getUserTransactions(userId: string, filters: GetTransactionsDto) {
    const query: any = { user: new Types.ObjectId(userId) };

    // Apply filters
    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.balanceType) {
      query.balanceType = filters.balanceType;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.reference) {
      query.reference = new RegExp(filters.reference, 'i');
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = timeZoneMoment(filters.startDate).startOf('day').toDate();
      }
      if (filters.endDate) {
        query.createdAt.$lte = timeZoneMoment(filters.endDate).endOf('day').toDate();
      }
    }

    // Amount range filter
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      query.amount = {};
      if (filters.minAmount !== undefined) {
        query.amount.$gte = filters.minAmount;
      }
      if (filters.maxAmount !== undefined) {
        query.amount.$lte = filters.maxAmount;
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.transactionModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.transactionModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: {
        transactions: transactions.map(this.formatTransaction),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    };
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(userId: string, transactionId: string) {
    const transaction = await this.transactionModel
      .findOne({
        _id: new Types.ObjectId(transactionId),
        user: new Types.ObjectId(userId),
      })
      .lean();

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      success: true,
      data: this.formatTransaction(transaction),
    };
  }

  /**
   * Reverse a transaction
   */
  async reverseTransaction(transactionId: string, reason: string): Promise<WalletTransaction> {
    const originalTransaction = await this.transactionModel.findById(new Types.ObjectId(transactionId));

    if (!originalTransaction) {
      throw new NotFoundException('Original transaction not found');
    }

    if (originalTransaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException('Can only reverse completed transactions');
    }

    if (originalTransaction.reversedAt) {
      throw new BadRequestException('Transaction already reversed');
    }

    // Update original transaction
    originalTransaction.status = TransactionStatus.REVERSED;
    originalTransaction.reversedAt = new Date();
    originalTransaction.failureReason = reason;
    await originalTransaction.save();

    // Create reversal transaction
    const reversalData: CreateTransactionData = {
      userId: originalTransaction.user.toString(),
      walletId: originalTransaction.wallet.toString(),
      type: originalTransaction.type === TransactionType.CREDIT ? TransactionType.DEBIT : TransactionType.CREDIT,
      category: originalTransaction.category,
      balanceType: originalTransaction.balanceType,
      amount: originalTransaction.amount,
      // currency: originalTransaction.currency,
      // currencySymbol: originalTransaction.currencySymbol,
      depositBalanceBefore: originalTransaction.depositBalanceAfter,
      depositBalanceAfter:
        originalTransaction.type === TransactionType.CREDIT
          ? originalTransaction.depositBalanceAfter -
            (originalTransaction.depositBalanceAfter - originalTransaction.depositBalanceBefore)
          : originalTransaction.depositBalanceAfter +
            (originalTransaction.depositBalanceBefore - originalTransaction.depositBalanceAfter),
      withdrawableBalanceBefore: originalTransaction.withdrawableBalanceAfter,
      withdrawableBalanceAfter:
        originalTransaction.type === TransactionType.CREDIT
          ? originalTransaction.withdrawableBalanceAfter -
            (originalTransaction.withdrawableBalanceAfter - originalTransaction.withdrawableBalanceBefore)
          : originalTransaction.withdrawableBalanceAfter +
            (originalTransaction.withdrawableBalanceBefore - originalTransaction.withdrawableBalanceAfter),
      totalBalanceBefore: originalTransaction.totalBalanceAfter,
      totalBalanceAfter:
        originalTransaction.type === TransactionType.CREDIT
          ? originalTransaction.totalBalanceAfter - originalTransaction.amount
          : originalTransaction.totalBalanceAfter + originalTransaction.amount,
      description: `Reversal: ${reason}`,
      reference: `reversal_${originalTransaction.transactionRef}`,
      metadata: {
        ...originalTransaction.metadata,
        reversalReason: reason,
        originalTransactionId: originalTransaction._id,
      },
      status: TransactionStatus.COMPLETED,
    };

    const reversalTransaction = await this.createTransaction(reversalData);

    // Link reversal to original
    await this.transactionModel.findByIdAndUpdate(reversalTransaction._id, {
      reversalOf: originalTransaction._id,
    });

    return reversalTransaction;
  }

  /**
   * Generate unique transaction reference
   */
  private generateTransactionRef(type: TransactionType, category: TransactionCategory): string {
    const prefix = type === TransactionType.CREDIT ? 'CR' : 'DB';
    const categoryCode = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = generateRandomString(4).toUpperCase();

    return `${prefix}${categoryCode}${timestamp}${random}`;
  }

  /**
   * Format transaction for response
   */
  private formatTransaction(transaction: any) {
    return {
      id: transaction._id,
      transactionRef: transaction.transactionRef,
      type: transaction.type,
      category: transaction.category,
      balanceType: transaction.balanceType,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      currencySymbol: transaction.currencySymbol,
      depositBalanceBefore: transaction.depositBalanceBefore,
      depositBalanceAfter: transaction.depositBalanceAfter,
      withdrawableBalanceBefore: transaction.withdrawableBalanceBefore,
      withdrawableBalanceAfter: transaction.withdrawableBalanceAfter,
      totalBalanceBefore: transaction.totalBalanceBefore,
      totalBalanceAfter: transaction.totalBalanceAfter,
      description: transaction.description,
      reference: transaction.reference,
      platformFee: transaction.platformFee,
      netAmount: transaction.netAmount,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
      reversedAt: transaction.reversedAt,
      failureReason: transaction.failureReason,
      metadata: transaction.metadata,
      displayAmount: `${transaction.currencySymbol}${transaction.amount.toFixed(2)}`,
    };
  }

  /**
   * Check transaction status from payment provider
   */
  private checkTrxnStatus(status: string) {
    if (MONNIFY_CONSTANTS.ResponseCode.SuccessResponseCode === status) {
      return MTransactionStatus.Success;
    } else if (MONNIFY_CONSTANTS.ResponseCode.PendingResponseCode === status) {
      return MTransactionStatus.Pending;
    } else if (MONNIFY_CONSTANTS.ResponseCode.FailedResponseCode === status) {
      return MTransactionStatus.Failed;
    }
  }

  /**
   * Verify and update transaction from payment webhook
   */
  async verifyAndUpdate(data: MonnifyTransactionDto & {}) {
    try {
      const paymentVerification = await this.paymentService.verifyTrx(data.paymentReference);
      if (this.checkTrxnStatus(paymentVerification.paymentStatus) === MTransactionStatus.Success) {
        // Find the transaction
        const transaction = await this.transactionModel.findOne({
          reference: data.paymentReference,
        });

        if (!transaction) {
          this.logger.error(`Transaction not found: ${data.paymentReference}`);
          return;
        }

        // Update transaction status
        await this.transactionModel.findOneAndUpdate(
          { reference: data.paymentReference },
          {
            status: TransactionStatus.COMPLETED,
            completedAt: new Date(),
          },
        );

        // Update wallet balance if transaction is now completed
        const wallet = await this.walletRepository.findOne({
          _id: transaction.wallet,
        });

        if (wallet && transaction.type === TransactionType.CREDIT) {
          await this.walletRepository.findOneAndUpdate(
            { _id: wallet._id },
            {
              depositBalance: transaction.depositBalanceAfter,
              totalBalance: transaction.totalBalanceAfter,
              totalDeposited: wallet.totalDeposited + transaction.amount,
              lastTransactionDate: new Date(),
            },
          );
        }

        this.logger.log(`Transaction ${data.paymentReference} marked as completed`);
      } else if (this.checkTrxnStatus(paymentVerification.paymentStatus) === MTransactionStatus.Failed) {
        await this.transactionModel.findOneAndUpdate(
          { reference: data.paymentReference },
          {
            status: TransactionStatus.FAILED,
            failureReason: paymentVerification.paymentDescription || 'Payment failed',
          },
        );

        this.logger.log(`Transaction ${data.paymentReference} marked as failed`);
      }
    } catch (error) {
      this.logger.error('Error verifying transaction:', error);
      throw error;
    }
  }
}
