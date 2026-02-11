/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, Post, Body, UseGuards, Query, Param, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import {
  GetTransactionsDto,
  DepositDto,
  WithdrawalDto,
  WalletBalanceDto,
  TransactionResponseDto,
  WalletSummaryDto,
} from './dto/wallet-transaction.dto';
import { CurrentUser, JwtAuthGuard, Public, SetRolesMetaData } from '@libs/auth';
import { User } from '@libs/database';
import { Role } from '@libs/common/enums';
import { WalletsService } from './wallets.service';

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('balance')
  @SetRolesMetaData(Role.NORMAL_USER)
  @ApiOperation({
    summary: 'Get wallet balance with deposit and withdrawable breakdown',
  })
  @ApiResponse({ status: 200, type: WalletBalanceDto })
  async getBalance(@CurrentUser() user: User) {
    return await this.walletsService.getWalletBalance(user);
  }

  @Post('deposit')
  @SetRolesMetaData(Role.NORMAL_USER)
  @ApiOperation({
    summary: 'Deposit funds to wallet (goes to deposit balance)',
  })
  async deposit(@CurrentUser() user: User, @Body() dto: DepositDto) {
    return await this.walletsService.processDeposit(user, dto);
  }

  @Post('withdraw')
  @SetRolesMetaData(Role.NORMAL_USER)
  @ApiOperation({ summary: 'Withdraw funds from withdrawable balance' })
  async withdraw(@CurrentUser() user: User, @Body() dto: WithdrawalDto) {
    return await this.walletsService.processWithdrawal(user, dto);
  }

  @Get('transactions')
  @SetRolesMetaData(Role.NORMAL_USER)
  @ApiOperation({ summary: 'Get user transactions with filters' })
  async getTransactions(@CurrentUser() user: User, @Query() query: GetTransactionsDto) {
    return await this.walletsService.getUserTransactions(user._id, query);
  }

  @Get('transactions/:id')
  @SetRolesMetaData(Role.NORMAL_USER)
  @ApiOperation({ summary: 'Get specific transaction details' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  async getTransaction(@CurrentUser() user: User, @Param('id') transactionId: string) {
    return await this.walletsService.getTransactionDetails(user._id, transactionId);
  }

  @Get('summary')
  @SetRolesMetaData(Role.NORMAL_USER)
  @ApiOperation({ summary: 'Get wallet summary and statistics' })
  @ApiResponse({ status: 200, type: WalletSummaryDto })
  async getWalletSummary(@CurrentUser() user: User) {
    return await this.walletsService.getWalletSummary(user._id);
  }

  // Admin endpoints
  // @Post('admin/credit')
  // @UseGuards(RolesGuard)
  // @SetRolesMetaData(Role.ADMIN)
  // @ApiOperation({ summary: 'Credit user wallet (Admin only)' })
  // async adminCreditWallet(@CurrentUser() admin: User, @Body() dto: AdminWalletOperationDto) {
  //   return await this.walletsService.adminCreditWallet(
  //     dto.userId,
  //     dto.amount,
  //     dto.balanceType,
  //     dto.description,
  //     admin._id.toString(),
  //   );
  // }

  // @Post('admin/debit')
  // @UseGuards(RolesGuard)
  // @SetRolesMetaData(Role.ADMIN)
  // @ApiOperation({ summary: 'Debit user wallet (Admin only)' })
  // async adminDebitWallet(@CurrentUser() admin: User, @Body() dto: AdminWalletOperationDto) {
  //   return await this.walletsService.adminDebitWallet(
  //     dto.userId,
  //     dto.amount,
  //     dto.balanceType,
  //     dto.description,
  //     admin._id.toString(),
  //   );
  // }

  // @Get('admin/report')
  // @UseGuards(RolesGuard)
  // @SetRolesMetaData(Role.ADMIN)
  // @ApiOperation({ summary: 'Get transaction report (Admin only)' })
  // async getTransactionReport(@CurrentUser() admin: User, @Query() filters: TransactionReportFiltersDto) {
  //   return await this.walletsService.getAdminTransactionReport(filters);
  // }

  // Webhook endpoint for payment provider
  @Post('webhook/monnify')
  @Public()
  @ApiOperation({ summary: 'Monnify webhook for payment notifications' })
  async monnifyWebhook(@Body() body: any, @Headers('monnify-signature') signature: string) {
    return await this.walletsService.transactionHook(body, signature);
  }
}
