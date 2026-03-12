import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminEarningsService } from './earnings.service';
import { EarningsFilterDto } from './dto';
import { AdminJwtAuthGuard, PermissionGuard, RequirePermissions } from '../auth/guards';
import { AdminPermissionEnum } from '@libs/database';

@ApiTags('Admin - Earnings & Revenue')
@Controller('earnings')
@UseGuards(AdminJwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class AdminEarningsController {
  constructor(private readonly earningsService: AdminEarningsService) {}

  @ApiOperation({ summary: 'Get earnings stats (total, commission, payouts, pending)' })
  @RequirePermissions(AdminPermissionEnum.FINANCE_VIEW)
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.earningsService.getEarningsStats(startDate, endDate);
  }

  @ApiOperation({ summary: 'Get transactions list (filterable by tab: all, ride_fares, payouts, refunds)' })
  @RequirePermissions(AdminPermissionEnum.FINANCE_VIEW)
  @Get('transactions')
  async getTransactions(@Query() filters: EarningsFilterDto) {
    return await this.earningsService.getTransactions(filters);
  }

  @ApiOperation({ summary: 'Get daily revenue trend for chart' })
  @RequirePermissions(AdminPermissionEnum.FINANCE_VIEW)
  @ApiQuery({ name: 'days', required: false })
  @Get('revenue-trend')
  async getRevenueTrend(@Query('days') days?: number) {
    return await this.earningsService.getRevenueTrend(days || 30);
  }
}
