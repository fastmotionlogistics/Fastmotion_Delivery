import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AdminNotificationService } from './notification.service';
import {
  SendNotificationDto,
  BroadcastNotificationDto,
  NotificationFilterDto,
} from './dto';
import { AdminPermissionEnum } from '@libs/database';
import {
  AdminJwtAuthGuard,
  PermissionGuard,
  RequirePermissions,
} from '../auth/guards';

@ApiTags('Admin - Notifications')
@Controller('notifications')
@UseGuards(AdminJwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class AdminNotificationController {
  constructor(private readonly notifService: AdminNotificationService) {}

  @ApiOperation({ summary: 'Send notification to a single user or rider' })
  @RequirePermissions(AdminPermissionEnum.DELIVERY_VIEW) // TODO: add NOTIFICATION_SEND permission
  @ApiBody({ type: SendNotificationDto })
  @Post('send')
  async sendNotification(@Body() body: SendNotificationDto) {
    return this.notifService.sendNotification(body);
  }

  @ApiOperation({ summary: 'Broadcast notification to users, riders, or all' })
  @RequirePermissions(AdminPermissionEnum.DELIVERY_VIEW) // TODO: add NOTIFICATION_BROADCAST permission
  @ApiBody({ type: BroadcastNotificationDto })
  @Post('broadcast')
  async broadcastNotification(@Body() body: BroadcastNotificationDto) {
    return this.notifService.broadcastNotification(body);
  }

  @ApiOperation({ summary: 'Get notification history' })
  @RequirePermissions(AdminPermissionEnum.DELIVERY_VIEW)
  @Get('history')
  async getNotificationHistory(@Query() filters: NotificationFilterDto) {
    return this.notifService.getNotificationHistory(filters);
  }

  @ApiOperation({ summary: 'Search users/riders for notification recipient' })
  @RequirePermissions(AdminPermissionEnum.DELIVERY_VIEW)
  @Get('search-recipients')
  async searchRecipients(
    @Query('targetType') targetType: string,
    @Query('search') search: string,
  ) {
    return this.notifService.searchRecipients(targetType || 'user', search || '');
  }
}
