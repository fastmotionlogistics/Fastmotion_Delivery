/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { Types } from 'mongoose';

import { TransactionService } from './transaction.service';
import { ConfigService } from '@nestjs/config';
import { BalanceType, TransactionCategory, User } from '@libs/database';
import { sha512ComputeHash, TransactionStatus, TransactionType } from '@libs/common';
import { DepositDto, GetTransactionsDto, WithdrawalDto } from './dto';
import { WalletRepository } from './repository/wallet.repository';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    private readonly walletRepository: WalletRepository,
    // private readonly countryRepository: CountryRepository,
    private readonly transactionService: TransactionService,
    // private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create wallet for a user
   */
  async createWallet(userId: Types.ObjectId) {
    // Get user with country
    // const user = await this.userRepository.findOne({ _id: userId });

    // if (!user || !user.country) {
    //   throw new BadRequestException('User or country not found');
    // }

    // Check if wallet already exists
    const existingWallet = await this.walletRepository.findOne({
      user: userId,
    });

    if (existingWallet) {
      return existingWallet;
    }

    // const country = user.country as any as Country;

    // Create new wallet with user's currency
    const wallet = await this.walletRepository.create({
      user: userId,
      currency: 'NGN',
      currencySymbol: '₦',
      depositBalance: 0,
      withdrawableBalance: 0,
      totalBalance: 0,
      isActive: true,
      isLocked: false,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalWinnings: 0,
    });

    // this.logger.log(`Created ${country.currency} wallet for user: ${userId}`);
    return wallet;
  }

  async disableAndLockWallet(userId: Types.ObjectId) {
    await this.walletRepository.findOneAndUpdate({ user: userId }, { isActive: false, isLocked: true });
    // await this.walletRepository.deleteOne({ user: userId });
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(user: User) {
    const wallet = await this.walletRepository.findOne({ user: user._id });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      success: true,
      data: {
        depositBalance: wallet.depositBalance,
        withdrawableBalance: wallet.withdrawableBalance,
        totalBalance: wallet.totalBalance,
        currency: wallet.currency,
        currencySymbol: wallet.currencySymbol,
        displayDepositBalance: `${wallet.currencySymbol}${wallet.depositBalance.toFixed(2)}`,
        displayWithdrawableBalance: `${wallet.currencySymbol}${wallet.withdrawableBalance.toFixed(2)}`,
        displayTotalBalance: `${wallet.currencySymbol}${wallet.totalBalance.toFixed(2)}`,
        isLocked: wallet.isLocked,
        totalDeposited: wallet.totalDeposited,
        totalWithdrawn: wallet.totalWithdrawn,
        totalWinnings: wallet.totalWinnings,
      },
    };
  }

  /**
   * Process deposit - goes to deposit balance
   */
  async processDeposit(user: User, dto: DepositDto) {
    return await this.creditWallet(
      user._id,
      dto.amount,
      TransactionCategory.DEPOSIT,
      BalanceType.DEPOSIT,
      `Deposit via ${dto.paymentMethod || 'Card'}`,
      dto.reference,
      {
        paymentMethod: dto.paymentMethod,
      },
    );
  }

  /**
   * Process withdrawal - from withdrawable balance only
   */
  async processWithdrawal(user: User, dto: WithdrawalDto) {
    const wallet = await this.walletRepository.findOne({ user: user._id });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Check if user has enough withdrawable balance
    if (wallet.withdrawableBalance < dto.amount) {
      throw new BadRequestException(
        `Insufficient withdrawable balance. You have ${wallet.currencySymbol}${wallet.withdrawableBalance.toFixed(
          2,
        )} available for withdrawal.`,
      );
    }

    return await this.debitWallet(
      user._id,
      dto.amount,
      TransactionCategory.WITHDRAWAL,
      BalanceType.WITHDRAWABLE,
      `Withdrawal to ${dto.accountNumber}`,
      `withdrawal_${Date.now()}`,
      {
        accountNumber: dto.accountNumber,
        bankCode: dto.bankCode,
        accountName: dto.accountName,
      },
    );
  }

  /**
   * Credit wallet - INTERNAL USE
   */
  async creditWallet(
    userId: Types.ObjectId,
    amount: number,
    category: TransactionCategory,
    balanceType: BalanceType,
    description: string,
    reference?: string,
    metadata?: Record<string, any>,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const wallet = await this.walletRepository.findOne({ user: userId });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (!wallet.isActive) {
      throw new BadRequestException('Wallet is not active');
    }

    if (wallet.isLocked) {
      throw new ConflictException('Wallet is locked for transaction');
    }

    // Lock wallet
    await this.walletRepository.findOneAndUpdate({ _id: wallet._id }, { isLocked: true });

    try {
      // Calculate new balances
      let newDepositBalance = wallet.depositBalance;
      let newWithdrawableBalance = wallet.withdrawableBalance;

      if (balanceType === BalanceType.DEPOSIT) {
        newDepositBalance += amount;
      } else if (balanceType === BalanceType.WITHDRAWABLE) {
        newWithdrawableBalance += amount;
      } else if (balanceType === BalanceType.BOTH) {
        // Split between both balances (customize as needed)
        newDepositBalance += amount / 2;
        newWithdrawableBalance += amount / 2;
      }

      const newTotalBalance = newDepositBalance + newWithdrawableBalance;

      // Create transaction record
      const transaction = await this.transactionService.createTransaction({
        userId: userId.toString(),
        walletId: wallet._id.toString(),
        type: TransactionType.CREDIT,
        category,
        balanceType,
        amount,
        // currency: wallet.currency,
        // currencySymbol: wallet.currencySymbol,
        depositBalanceBefore: wallet.depositBalance,
        depositBalanceAfter: newDepositBalance,
        withdrawableBalanceBefore: wallet.withdrawableBalance,
        withdrawableBalanceAfter: newWithdrawableBalance,
        totalBalanceBefore: wallet.totalBalance,
        totalBalanceAfter: newTotalBalance,
        description,
        reference,
        metadata,
        status: TransactionStatus.COMPLETED,
      });

      // Update wallet balances and stats
      const updateData: any = {
        depositBalance: newDepositBalance,
        withdrawableBalance: newWithdrawableBalance,
        totalBalance: newTotalBalance,
        isLocked: false,
        lastTransactionDate: new Date(),
      };

      // Update lifetime stats
      // if (category === TransactionCategory.DEPOSIT) {
      //   updateData.totalDeposited = wallet.totalDeposited + amount;
      // } else if (category === TransactionCategory.CONTEST_PRIZE) {
      //   updateData.totalWinnings = wallet.totalWinnings + amount;
      // }

      await this.walletRepository.findOneAndUpdate({ _id: wallet._id }, updateData);

      this.logger.log(
        `Credited ${wallet.currencySymbol}${amount} to ${balanceType} balance of wallet ${wallet._id} for user ${userId}`,
      );

      return {
        success: true,
        message: 'Wallet credited successfully',
        data: {
          transactionId: transaction._id,
          transactionRef: transaction.transactionRef,
          previousDepositBalance: wallet.depositBalance,
          previousWithdrawableBalance: wallet.withdrawableBalance,
          newDepositBalance,
          newWithdrawableBalance,
          newTotalBalance,
          amountCredited: amount,
          displayAmount: `${wallet.currencySymbol}${amount.toFixed(2)}`,
          currency: wallet.currency,
          balanceType,
        },
      };
    } catch (error) {
      // Unlock wallet on error
      await this.walletRepository.findOneAndUpdate({ _id: wallet._id }, { isLocked: false });
      throw error;
    }
  }

  /**
   * Debit wallet - INTERNAL USE
   */
  async debitWallet(
    userId: Types.ObjectId,
    amount: number,
    category: TransactionCategory,
    balanceType: BalanceType,
    description: string,
    reference?: string,
    metadata?: Record<string, any>,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const wallet = await this.walletRepository.findOne({ user: userId });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (!wallet.isActive) {
      throw new BadRequestException('Wallet is not active');
    }

    if (wallet.isLocked) {
      throw new ConflictException('Wallet is locked for transaction');
    }

    // Check sufficient balance based on balance type
    if (balanceType === BalanceType.DEPOSIT && wallet.depositBalance < amount) {
      throw new BadRequestException('Insufficient deposit balance');
    } else if (balanceType === BalanceType.WITHDRAWABLE && wallet.withdrawableBalance < amount) {
      throw new BadRequestException('Insufficient withdrawable balance');
    } else if (balanceType === BalanceType.BOTH && wallet.totalBalance < amount) {
      throw new BadRequestException('Insufficient total balance');
    }

    // Lock wallet
    await this.walletRepository.findOneAndUpdate({ _id: wallet._id }, { isLocked: true });

    try {
      // Calculate new balances
      let newDepositBalance = wallet.depositBalance;
      let newWithdrawableBalance = wallet.withdrawableBalance;

      if (balanceType === BalanceType.DEPOSIT) {
        newDepositBalance -= amount;
      } else if (balanceType === BalanceType.WITHDRAWABLE) {
        newWithdrawableBalance -= amount;
      } else if (balanceType === BalanceType.BOTH) {
        // Deduct from deposit first, then withdrawable
        if (wallet.depositBalance >= amount) {
          newDepositBalance -= amount;
        } else {
          const remainingAmount = amount - wallet.depositBalance;
          newDepositBalance = 0;
          newWithdrawableBalance -= remainingAmount;
        }
      }

      const newTotalBalance = newDepositBalance + newWithdrawableBalance;

      // Create transaction record
      const transaction = await this.transactionService.createTransaction({
        userId: userId.toString(),
        walletId: wallet._id.toString(),
        type: TransactionType.DEBIT,
        category,
        balanceType,
        amount,
        // currency: wallet.currency,
        // currencySymbol: wallet.currencySymbol,
        depositBalanceBefore: wallet.depositBalance,
        depositBalanceAfter: newDepositBalance,
        withdrawableBalanceBefore: wallet.withdrawableBalance,
        withdrawableBalanceAfter: newWithdrawableBalance,
        totalBalanceBefore: wallet.totalBalance,
        totalBalanceAfter: newTotalBalance,
        description,
        reference,
        metadata,
        status: TransactionStatus.COMPLETED,
      });

      // Update wallet balances and stats
      const updateData: any = {
        depositBalance: newDepositBalance,
        withdrawableBalance: newWithdrawableBalance,
        totalBalance: newTotalBalance,
        isLocked: false,
        lastTransactionDate: new Date(),
      };

      // Update lifetime stats
      if (category === TransactionCategory.WITHDRAWAL) {
        updateData.totalWithdrawn = wallet.totalWithdrawn + amount;
      }

      await this.walletRepository.findOneAndUpdate({ _id: wallet._id }, updateData);

      this.logger.log(
        `Debited ${wallet.currencySymbol}${amount} from ${balanceType} balance of wallet ${wallet._id} for user ${userId}`,
      );

      return {
        success: true,
        message: 'Wallet debited successfully',
        data: {
          transactionId: transaction._id,
          transactionRef: transaction.transactionRef,
          previousDepositBalance: wallet.depositBalance,
          previousWithdrawableBalance: wallet.withdrawableBalance,
          newDepositBalance,
          newWithdrawableBalance,
          newTotalBalance,
          amountDebited: amount,
          displayAmount: `${wallet.currencySymbol}${amount.toFixed(2)}`,
          currency: wallet.currency,
          balanceType,
        },
      };
    } catch (error) {
      // Unlock wallet on error
      await this.walletRepository.findOneAndUpdate({ _id: wallet._id }, { isLocked: false });
      throw error;
    }
  }

  /**
   * Process transfer fee - INTERNAL USE
   */
  // async processTransferFee(
  //   userId: Types.ObjectId,
  //   playerId: string,
  //   transferType: 'IN' | 'OUT',
  //   transferNumber: number,
  // ) {
  //   // Get transfer settings
  //   const settings = await this.settingsService.getModuleSettings('transfer');

  //   // Get wallet to check currency
  //   const wallet = await this.walletRepository.findOne({ user: userId });
  //   if (!wallet) {
  //     throw new NotFoundException('Wallet not found');
  //   }

  //   // Calculate fee in wallet currency
  //   let fee = 0;
  //   if (transferNumber > settings.freeTransfersPerWeek) {
  //     fee = settings.transferCostCoins; // This should be converted to local currency
  //     // For now, we'll use this as is
  //   }

  //   if (fee === 0) {
  //     return {
  //       success: true,
  //       charged: false,
  //       message: 'Free transfer used',
  //     };
  //   }

  //   // Process the fee from deposit balance
  //   const result = await this.debitWallet(
  //     userId,
  //     fee,
  //     TransactionCategory.TRANSFER_FEE,
  //     BalanceType.DEPOSIT,
  //     `Transfer fee for ${transferType === 'IN' ? 'signing' : 'selling'} player`,
  //     `transfer_${playerId}_${transferType}`,
  //     {
  //       playerId,
  //       transferType,
  //       transferNumber,
  //       gameweek: await this.getCurrentGameweek(),
  //     },
  //   );

  //   return {
  //     success: true,
  //     charged: true,
  //     fee,
  //     currency: wallet.currency,
  //     ...result,
  //   };
  // }

  /**
   * Process league entry fee - deducts from deposit balance
   */
  // async processLeagueEntry(userId: Types.ObjectId, leagueId: string, leagueName: string, entryFee: number) {
  //   if (entryFee === 0) {
  //     return {
  //       success: true,
  //       charged: false,
  //       message: 'Free league entry',
  //     };
  //   }

  //   // Get settings for commission
  //   const settings = await this.settingsService.getModuleSettings('league');
  //   const commission = (entryFee * settings.platformCommissionPercent) / 100;
  //   const prizePoolContribution = entryFee - commission;

  //   // Process the entry fee from deposit balance
  //   const result = await this.debitWallet(
  //     userId,
  //     entryFee,
  //     TransactionCategory.LEAGUE_ENTRY,
  //     BalanceType.DEPOSIT,
  //     `Entry fee for league: ${leagueName}`,
  //     `league_entry_${leagueId}`,
  //     {
  //       leagueId,
  //       leagueName,
  //       entryFee,
  //       commission,
  //       prizePoolContribution,
  //       gameweek: await this.getCurrentGameweek(),
  //     },
  //   );

  //   return {
  //     success: true,
  //     charged: true,
  //     entryFee,
  //     commission,
  //     prizePoolContribution,
  //     ...result,
  //   };
  // }

  /**
   * Process league prize distribution - credits withdrawable balance
   */
  // async distributeLeaguePrize(
  //   userId: Types.ObjectId,
  //   leagueId: string,
  //   leagueName: string,
  //   position: number,
  //   prizeAmount: number,
  // ) {
  //   const result = await this.creditWallet(
  //     userId,
  //     prizeAmount,
  //     TransactionCategory.LEAGUE_PRIZE,
  //     BalanceType.WITHDRAWABLE,
  //     `Prize for finishing #${position} in ${leagueName}`,
  //     `league_prize_${leagueId}_${position}`,
  //     {
  //       leagueId,
  //       leagueName,
  //       position,
  //       season: await this.getCurrentSeason(),
  //     },
  //   );

  //   return {
  //     success: true,
  //     prizeAmount,
  //     ...result,
  //   };
  // }

  /**
   * Process refund - credits to original balance type
   */
  async processRefund(
    userId: Types.ObjectId,
    amount: number,
    originalTransactionRef: string,
    reason: string,
    balanceType: BalanceType,
  ) {
    const result = await this.creditWallet(
      userId,
      amount,
      TransactionCategory.REFUND,
      balanceType,
      `Refund: ${reason}`,
      `refund_${originalTransactionRef}`,
      {
        originalTransactionRef,
        reason,
        refundedAt: new Date(),
      },
    );

    return {
      success: true,
      refundAmount: amount,
      ...result,
    };
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(userId: Types.ObjectId, filters: GetTransactionsDto) {
    return await this.transactionService.getUserTransactions(userId.toString(), filters);
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(userId: Types.ObjectId, transactionId: string) {
    return await this.transactionService.getTransactionDetails(userId.toString(), transactionId);
  }

  /**
   * Get wallet summary
   */
  async getWalletSummary(userId: Types.ObjectId) {
    const wallet = await this.walletRepository.findOne({ user: userId });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // const summary = await this.transactionService.getWalletSummary(userId.toString());

    return {
      success: true,
      data: {
        currentDepositBalance: wallet.depositBalance,
        currentWithdrawableBalance: wallet.withdrawableBalance,
        currentTotalBalance: wallet.totalBalance,
        currency: wallet.currency,
        currencySymbol: wallet.currencySymbol,
        // ...summary,
      },
    };
  }

  /**
   * Check if user can afford amount from specific balance
   */
  // async canAfford(
  //   userId: Types.ObjectId,
  //   amount: number,
  //   balanceType: BalanceType = BalanceType.DEPOSIT,
  // ): Promise<boolean> {
  //   const wallet = await this.walletRepository.findOne({ user: userId });
  //   if (!wallet || !wallet.isActive || wallet.isLocked) {
  //     return false;
  //   }

  //   if (balanceType === BalanceType.DEPOSIT) {
  //     return wallet.depositBalance >= amount;
  //   } else if (balanceType === BalanceType.WITHDRAWABLE) {
  //     return wallet.withdrawableBalance >= amount;
  //   } else {
  //     return wallet.totalBalance >= amount;
  //   }
  // }

  /**
   * Admin functions
   */
  async adminCreditWallet(
    userId: string,
    amount: number,
    balanceType: BalanceType,
    description: string,
    adminId: string,
  ) {
    const result = await this.creditWallet(
      new Types.ObjectId(userId),
      amount,
      TransactionCategory.BAKERY_ORDER_DEPOSIT,
      balanceType,
      description,
      `admin_credit_${adminId}`,
      {
        adminId,
        adminAction: 'CREDIT',
      },
    );

    this.logger.log(`Admin ${adminId} credited ${amount} to ${balanceType} balance of user ${userId}`);

    return result;
  }

  async adminDebitWallet(
    userId: string,
    amount: number,
    balanceType: BalanceType,
    description: string,
    adminId: string,
  ) {
    const result = await this.debitWallet(
      new Types.ObjectId(userId),
      amount,
      TransactionCategory.ADJUSTMENT,
      balanceType,
      description,
      `admin_debit_${adminId}`,
      {
        adminId,
        adminAction: 'DEBIT',
      },
    );

    this.logger.log(`Admin ${adminId} debited ${amount} from ${balanceType} balance of user ${userId}`);

    return result;
  }

  /**
   * Get admin transaction report
   */
  // async getAdminTransactionReport(filters: any) {
  //   return await this.transactionService.getAdminTransactionReport(filters);
  // }

  /**
   * Transaction webhook handler
   */
  async transactionHook(monnifyResponse: { eventData: any }, monnifySignature: string) {
    const sha512 = sha512ComputeHash(
      JSON.stringify(monnifyResponse),
      this.configService.getOrThrow('MONNIFY_WALLET_SECRET_KEY'),
    );

    if (sha512 === monnifySignature) {
      monnifyResponse.eventData.metaData = Object.fromEntries(
        Object.entries(monnifyResponse.eventData.metaData).map(([key, value]) => [key, parseInt(value as string, 10)]),
      );

      await this.transactionService.verifyAndUpdate(monnifyResponse.eventData);
    }
  }

  // Helper methods
}
