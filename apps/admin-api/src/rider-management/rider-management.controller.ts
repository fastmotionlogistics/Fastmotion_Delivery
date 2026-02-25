import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RiderManagementService } from './rider-management.service';
import {
  CreateRiderDto,
  UpdateRiderDto,
  SuspendRiderDto,
  ResetRiderPasswordDto,
  BindDeviceDto,
  VerifyRiderDto,
  RiderFilterDto,
} from './dto';
import { Admin, AdminPermissionEnum } from '@libs/database';
import {
  AdminJwtAuthGuard,
  PermissionGuard,
  RequirePermissions,
} from '../auth/guards';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';

@ApiTags('Admin - Rider Management')
@Controller('riders')
@UseGuards(AdminJwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class RiderManagementController {
  constructor(private readonly riderService: RiderManagementService) {}

  @ApiOperation({ summary: 'Create a new rider account' })
  @RequirePermissions(AdminPermissionEnum.RIDER_CREATE)
  @Post()
  async createRider(@CurrentAdmin() admin: Admin, @Body() body: CreateRiderDto) {
    return await this.riderService.createRider(admin, body);
  }

  @ApiOperation({ summary: 'List all riders with filters' })
  @RequirePermissions(AdminPermissionEnum.RIDER_VIEW)
  @Get()
  async getAllRiders(@Query() filters: RiderFilterDto) {
    return await this.riderService.getAllRiders(filters);
  }

  @ApiOperation({ summary: 'Get rider stats overview' })
  @RequirePermissions(AdminPermissionEnum.RIDER_VIEW)
  @Get('stats')
  async getRiderStats() {
    return await this.riderService.getRiderStats();
  }

  @ApiOperation({ summary: 'Get rider by ID' })
  @RequirePermissions(AdminPermissionEnum.RIDER_VIEW)
  @Get(':id')
  async getRiderById(@Param('id') id: string) {
    return await this.riderService.getRiderById(id);
  }

  @ApiOperation({ summary: 'Update rider details' })
  @RequirePermissions(AdminPermissionEnum.RIDER_EDIT)
  @Put(':id')
  async updateRider(@Param('id') id: string, @Body() body: UpdateRiderDto) {
    return await this.riderService.updateRider(id, body);
  }

  @ApiOperation({ summary: 'Verify or reject rider' })
  @RequirePermissions(AdminPermissionEnum.RIDER_VERIFY)
  @Post(':id/verify')
  async verifyRider(@Param('id') id: string, @Body() body: VerifyRiderDto) {
    return await this.riderService.verifyRider(id, body);
  }

  @ApiOperation({ summary: 'Suspend rider' })
  @RequirePermissions(AdminPermissionEnum.RIDER_SUSPEND)
  @Post(':id/suspend')
  async suspendRider(
    @CurrentAdmin() admin: Admin,
    @Param('id') id: string,
    @Body() body: SuspendRiderDto,
  ) {
    return await this.riderService.suspendRider(admin, id, body);
  }

  @ApiOperation({ summary: 'Unsuspend rider' })
  @RequirePermissions(AdminPermissionEnum.RIDER_SUSPEND)
  @Post(':id/unsuspend')
  async unsuspendRider(@Param('id') id: string) {
    return await this.riderService.unsuspendRider(id);
  }

  @ApiOperation({ summary: 'Reset rider password' })
  @RequirePermissions(AdminPermissionEnum.RIDER_EDIT)
  @Post(':id/reset-password')
  async resetRiderPassword(
    @Param('id') id: string,
    @Body() body: ResetRiderPasswordDto,
  ) {
    return await this.riderService.resetRiderPassword(id, body);
  }

  @ApiOperation({ summary: 'Update device binding (bind/unbind device)' })
  @RequirePermissions(AdminPermissionEnum.RIDER_EDIT)
  @Patch(':id/device')
  async updateDeviceBinding(
    @Param('id') id: string,
    @Body() body: BindDeviceDto,
  ) {
    return await this.riderService.updateDeviceBinding(id, body);
  }
}
