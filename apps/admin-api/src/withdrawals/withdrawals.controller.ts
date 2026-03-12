import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WithdrawalsService } from './withdrawals.service';
import { AdminPermissionEnum, AuditCategoryEnum } from '@libs/database';
import { AdminJwtAuthGuard, PermissionGuard, RequirePermissions } from '../auth/guards';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { AuditAction } from '../audit/audit-action.decorator';

@ApiTags('Admin - Withdrawal Management')
@Controller('withdrawals')
@UseGuards(AdminJwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @ApiOperation({ summary: 'Get withdrawal requests' })
  @RequirePermissions(AdminPermissionEnum.FINANCE_VIEW)
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get()
  async getWithdrawals(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.withdrawalsService.getWithdrawals({
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @ApiOperation({ summary: 'Get withdrawal stats' })
  @RequirePermissions(AdminPermissionEnum.FINANCE_VIEW)
  @Get('stats')
  async getStats() {
    return this.withdrawalsService.getWithdrawalStats();
  }

  @ApiOperation({ summary: 'Approve withdrawal request' })
  @RequirePermissions(AdminPermissionEnum.FINANCE_MANAGE)
  @AuditAction({ action: 'Approve Withdrawal', category: AuditCategoryEnum.FINANCE, targetType: 'WithdrawalRequest', targetIdParam: 'id' })
  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @CurrentAdmin() admin: any,
    @Body('note') note?: string,
  ) {
    return this.withdrawalsService.approveWithdrawal(id, admin._id, note);
  }

  @ApiOperation({ summary: 'Reject withdrawal request' })
  @RequirePermissions(AdminPermissionEnum.FINANCE_MANAGE)
  @AuditAction({ action: 'Reject Withdrawal', category: AuditCategoryEnum.FINANCE, targetType: 'WithdrawalRequest', targetIdParam: 'id' })
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @CurrentAdmin() admin: any,
    @Body('note') note?: string,
  ) {
    return this.withdrawalsService.rejectWithdrawal(id, admin._id, note);
  }
}
