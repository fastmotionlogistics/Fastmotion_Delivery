import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto, FundWalletDto, VerifyPaymentDto, WithdrawDto } from './dto';
import { CurrentUser, JwtAuthGuard } from '@libs/auth';
import { User } from '@libs/database';

@ApiTags('Payment')
@Controller('payment')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({ summary: 'Initiate payment for a delivery' })
  @ApiBody({ type: InitiatePaymentDto })
  @Post('initiate')
  async initiatePayment(@CurrentUser() user: User, @Body() body: InitiatePaymentDto) {
    return await this.paymentService.initiatePayment(user, body);
  }

  @ApiOperation({ summary: 'Verify payment status' })
  @ApiBody({ type: VerifyPaymentDto })
  @Post('verify')
  async verifyPayment(@CurrentUser() user: User, @Body() body: VerifyPaymentDto) {
    return await this.paymentService.verifyPayment(user, body);
  }

  @ApiOperation({ summary: 'Get wallet balance' })
  @Get('wallet')
  async getWalletBalance(@CurrentUser() user: User) {
    return await this.paymentService.getWalletBalance(user);
  }

  @ApiOperation({ summary: 'Fund wallet' })
  @ApiBody({ type: FundWalletDto })
  @Post('wallet/fund')
  async fundWallet(@CurrentUser() user: User, @Body() body: FundWalletDto) {
    return await this.paymentService.fundWallet(user, body);
  }

  @ApiOperation({ summary: 'Withdraw from wallet' })
  @ApiBody({ type: WithdrawDto })
  @Post('wallet/withdraw')
  async withdrawFromWallet(@CurrentUser() user: User, @Body() body: WithdrawDto) {
    return await this.paymentService.withdrawFromWallet(user, body);
  }

  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get('wallet/transactions')
  async getWalletTransactions(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.paymentService.getWalletTransactions(user, { page, limit });
  }

  @ApiOperation({ summary: 'Get payment by ID' })
  @Get(':id')
  async getPaymentById(@CurrentUser() user: User, @Param('id') id: string) {
    return await this.paymentService.getPaymentById(user, id);
  }

  @ApiOperation({ summary: 'Get payment history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get()
  async getPaymentHistory(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.paymentService.getPaymentHistory(user, { page, limit });
  }
}
