/* eslint-disable @typescript-eslint/no-unused-vars */
import { TransactionType, TransactionStatus } from '@libs/common/enums';
import { BalanceType, TransactionCategory } from '@libs/database/schemas/walletTransaction.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsString, IsOptional, Min, IsMongoId, IsDateString, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class WalletBalanceDto {
  @ApiProperty()
  depositBalance: number;

  @ApiProperty()
  withdrawableBalance: number;

  @ApiProperty()
  totalBalance: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  currencySymbol: string;

  @ApiProperty()
  displayDepositBalance: string;

  @ApiProperty()
  displayWithdrawableBalance: string;

  @ApiProperty()
  displayTotalBalance: string;

  @ApiProperty()
  isLocked: boolean;

  @ApiProperty()
  totalDeposited: number;

  @ApiProperty()
  totalWithdrawn: number;

  @ApiProperty()
  totalWinnings: number;
}

export class DepositDto {
  @ApiProperty({ description: 'Amount in local currency' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;
}

export class WithdrawalDto {
  @ApiProperty({ description: 'Amount in local currency' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty()
  @IsString()
  accountNumber: string;

  @ApiProperty()
  @IsString()
  bankCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountName?: string;
}

export class CreateTransactionDto {
  @ApiProperty()
  @IsMongoId()
  userId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ enum: TransactionCategory })
  @IsEnum(TransactionCategory)
  category: TransactionCategory;

  @ApiProperty({ enum: BalanceType })
  @IsEnum(BalanceType)
  balanceType: BalanceType;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class TransferPlayerFeeDto {
  @ApiProperty()
  @IsString()
  playerId: string;

  @ApiProperty({ enum: ['IN', 'OUT'] })
  @IsEnum(['IN', 'OUT'])
  transferType: 'IN' | 'OUT';

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  transferNumber: number;
}

export class LeagueEntryDto {
  @ApiProperty()
  @IsString()
  leagueId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  entryFee: number;

  @ApiProperty()
  @IsString()
  leagueName: string;
}

export class GetTransactionsDto {
  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ enum: TransactionCategory })
  @IsOptional()
  @IsEnum(TransactionCategory)
  category?: TransactionCategory;

  @ApiPropertyOptional({ enum: BalanceType })
  @IsOptional()
  @IsEnum(BalanceType)
  balanceType?: BalanceType;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  transactionRef: string;

  @ApiProperty({ enum: TransactionType })
  type: TransactionType;

  @ApiProperty({ enum: TransactionCategory })
  category: TransactionCategory;

  @ApiProperty({ enum: BalanceType })
  balanceType: BalanceType;

  @ApiProperty({ enum: TransactionStatus })
  status: TransactionStatus;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  currencySymbol: string;

  @ApiProperty()
  depositBalanceBefore: number;

  @ApiProperty()
  depositBalanceAfter: number;

  @ApiProperty()
  withdrawableBalanceBefore: number;

  @ApiProperty()
  withdrawableBalanceAfter: number;

  @ApiProperty()
  totalBalanceBefore: number;

  @ApiProperty()
  totalBalanceAfter: number;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  reference?: string;

  @ApiPropertyOptional()
  platformFee?: number;

  @ApiPropertyOptional()
  netAmount?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  reversedAt?: Date;

  @ApiPropertyOptional()
  failureReason?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class WalletSummaryDto {
  @ApiProperty()
  currentDepositBalance: number;

  @ApiProperty()
  currentWithdrawableBalance: number;

  @ApiProperty()
  currentTotalBalance: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  currencySymbol: string;

  @ApiProperty()
  allTime: {
    totalDeposited: number;
    totalWithdrawn: number;
    totalWinnings: number;
    totalCredits: number;
    totalDebits: number;
    transactionCount: number;
  };

  @ApiProperty()
  monthly: {
    totalCredits: number;
    totalDebits: number;
    totalDeposited: number;
    totalWithdrawn: number;
  };

  @ApiProperty()
  categoryBreakdown: Array<{
    category: string;
    type: string;
    balanceType: string;
    total: number;
    count: number;
  }>;
}

export class ProcessTransferDto {
  @ApiProperty()
  @IsMongoId()
  userId: string;

  @ApiProperty()
  @IsString()
  playerId: string;

  @ApiProperty({ enum: ['IN', 'OUT'] })
  @IsEnum(['IN', 'OUT'])
  transferType: 'IN' | 'OUT';

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  transferNumber: number;
}

export class ProcessLeagueEntryDto {
  @ApiProperty()
  @IsMongoId()
  userId: string;

  @ApiProperty()
  @IsString()
  leagueId: string;

  @ApiProperty()
  @IsString()
  leagueName: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  entryFee: number;
}

export class DistributePrizeDto {
  @ApiProperty()
  @IsMongoId()
  userId: string;

  @ApiProperty()
  @IsString()
  leagueId: string;

  @ApiProperty()
  @IsString()
  leagueName: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  position: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  prizeAmount: number;
}

export class ProcessRefundDto {
  @ApiProperty()
  @IsMongoId()
  userId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsString()
  originalTransactionRef: string;

  @ApiProperty()
  @IsString()
  reason: string;
}

export class AdminWalletOperationDto {
  @ApiProperty({ description: 'User ID to credit/debit' })
  @IsMongoId()
  userId: string;

  @ApiProperty({ description: 'Amount in wallet currency', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Balance type to affect',
    enum: BalanceType,
  })
  @IsEnum(BalanceType)
  balanceType: BalanceType;

  @ApiProperty({ description: 'Description/reason for the operation' })
  @IsString()
  description: string;
}

// Admin Report DTOs
export class TransactionReportFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: TransactionCategory })
  @IsOptional()
  @IsEnum(TransactionCategory)
  category?: TransactionCategory;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}

export class TransactionReportDto {
  @ApiProperty()
  summary: {
    totalTransactions: number;
    byCurrency: Array<{
      currency: string;
      currencySymbol: string;
      totalAmount: number;
      totalDeposits: number;
      totalWithdrawals: number;
      totalPrizes: number;
      totalFees: number;
      totalCommissions: number;
      netRevenue: number;
    }>;
  };

  @ApiProperty()
  byCategory: Array<{
    category: string;
    count: number;
    byCurrency: Array<{
      currency: string;
      currencySymbol: string;
      totalAmount: number;
    }>;
  }>;

  @ApiProperty()
  byStatus: Array<{
    status: string;
    count: number;
    byCurrency: Array<{
      currency: string;
      currencySymbol: string;
      totalAmount: number;
    }>;
  }>;

  @ApiProperty()
  byDay: Array<{
    date: string;
    deposits: Record<string, number>;
    withdrawals: Record<string, number>;
    revenue: Record<string, number>;
    transactionCount: number;
  }>;

  @ApiProperty()
  topUsers: Array<{
    userId: string;
    userName: string;
    email: string;
    currency: string;
    currencySymbol: string;
    totalDeposited: number;
    totalWon: number;
    totalSpent: number;
    netProfit: number;
  }>;
}
