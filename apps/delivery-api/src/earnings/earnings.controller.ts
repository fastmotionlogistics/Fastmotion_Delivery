import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { EarningsService } from './earnings.service';
import { WithdrawEarningsDto, EarningsFilterDto } from './dto';
import { Rider } from '@libs/database';
import { RiderJwtAuthGuard } from '../auth/guards';
import { CurrentRider } from '../auth/decorators/current-rider.decorator';

@ApiTags('Rider Earnings')
@Controller('earnings')
@UseGuards(RiderJwtAuthGuard)
@ApiBearerAuth()
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @ApiOperation({ summary: 'Get earnings overview' })
  @Get('overview')
  async getEarningsOverview(@CurrentRider() rider: Rider) {
    return await this.earningsService.getEarningsOverview(rider);
  }

  @ApiOperation({ summary: 'Get available balance for withdrawal' })
  @Get('balance')
  async getAvailableBalance(@CurrentRider() rider: Rider) {
    return await this.earningsService.getAvailableBalance(rider);
  }

  @ApiOperation({ summary: 'Get earnings history' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get('history')
  async getEarningsHistory(
    @CurrentRider() rider: Rider,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.earningsService.getEarningsHistory(rider, {
      startDate,
      endDate,
      type,
      status,
      page,
      limit,
    });
  }

  @ApiOperation({ summary: 'Withdraw earnings to bank account' })
  @ApiBody({ type: WithdrawEarningsDto })
  @Post('withdraw')
  async withdrawEarnings(@CurrentRider() rider: Rider, @Body() body: WithdrawEarningsDto) {
    return await this.earningsService.withdrawEarnings(rider, body);
  }

  @ApiOperation({ summary: 'Get withdrawal history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get('withdrawals')
  async getWithdrawalHistory(
    @CurrentRider() rider: Rider,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.earningsService.getWithdrawalHistory(rider, { page, limit });
  }

  @ApiOperation({ summary: 'Get earnings by period (daily, weekly, monthly)' })
  @ApiQuery({ name: 'period', required: true, enum: ['daily', 'weekly', 'monthly'] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @Get('by-period')
  async getEarningsByPeriod(
    @CurrentRider() rider: Rider,
    @Query('period') period: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.earningsService.getEarningsByPeriod(rider, {
      period,
      startDate,
      endDate,
    });
  }

  @ApiOperation({ summary: 'Get today\'s earnings' })
  @Get('today')
  async getTodayEarnings(@CurrentRider() rider: Rider) {
    return await this.earningsService.getTodayEarnings(rider);
  }

  @ApiOperation({ summary: 'Get this week\'s earnings' })
  @Get('this-week')
  async getThisWeekEarnings(@CurrentRider() rider: Rider) {
    return await this.earningsService.getThisWeekEarnings(rider);
  }

  @ApiOperation({ summary: 'Get this month\'s earnings' })
  @Get('this-month')
  async getThisMonthEarnings(@CurrentRider() rider: Rider) {
    return await this.earningsService.getThisMonthEarnings(rider);
  }
}
