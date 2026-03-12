import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserManagementService } from './user-management.service';
import { UserFilterDto, SuspendUserDto } from './dto';
import { AdminPermissionEnum, AuditCategoryEnum } from '@libs/database';
import {
  AdminJwtAuthGuard,
  PermissionGuard,
  RequirePermissions,
} from '../auth/guards';
import { AuditAction } from '../audit/audit-action.decorator';

@ApiTags('Admin - User Management')
@Controller('users')
@UseGuards(AdminJwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class UserManagementController {
  constructor(private readonly userService: UserManagementService) {}

  @ApiOperation({ summary: 'List all users/customers with filters' })
  @RequirePermissions(AdminPermissionEnum.USER_VIEW)
  @Get()
  async getAllUsers(@Query() filters: UserFilterDto) {
    return await this.userService.getAllUsers(filters);
  }

  @ApiOperation({ summary: 'Get user stats overview' })
  @RequirePermissions(AdminPermissionEnum.USER_VIEW)
  @Get('stats')
  async getUserStats() {
    return await this.userService.getUserStats();
  }

  @ApiOperation({ summary: 'Get user by ID' })
  @RequirePermissions(AdminPermissionEnum.USER_VIEW)
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return await this.userService.getUserById(id);
  }

  @ApiOperation({ summary: 'Suspend user' })
  @RequirePermissions(AdminPermissionEnum.USER_SUSPEND)
  @AuditAction({ action: 'Suspend User', category: AuditCategoryEnum.USER, targetType: 'User', targetIdParam: 'id' })
  @Post(':id/suspend')
  async suspendUser(@Param('id') id: string, @Body() body: SuspendUserDto) {
    return await this.userService.suspendUser(id, body.reason);
  }

  @ApiOperation({ summary: 'Unsuspend/reactivate user' })
  @RequirePermissions(AdminPermissionEnum.USER_SUSPEND)
  @AuditAction({ action: 'Unsuspend User', category: AuditCategoryEnum.USER, targetType: 'User', targetIdParam: 'id' })
  @Post(':id/unsuspend')
  async unsuspendUser(@Param('id') id: string) {
    return await this.userService.unsuspendUser(id);
  }
}
