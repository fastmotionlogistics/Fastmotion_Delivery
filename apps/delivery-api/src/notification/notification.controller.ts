import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Rider } from '@libs/database';
import { RiderJwtAuthGuard } from '../auth/guards';
import { CurrentRider } from '../auth/decorators/current-rider.decorator';
import { RiderNotificationService } from './notification.service';

@ApiTags('Rider Notifications')
@Controller('notifications')
@UseGuards(RiderJwtAuthGuard)
@ApiBearerAuth()
export class RiderNotificationController {
  constructor(private readonly notifService: RiderNotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current rider' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'unreadOnly', required: false })
  async getNotifications(
    @CurrentRider() rider: Rider,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notifService.getNotifications(rider, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 30,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentRider() rider: Rider) {
    return this.notifService.getUnreadCount(rider);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@CurrentRider() rider: Rider, @Param('id') id: string) {
    return this.notifService.markAsRead(rider, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentRider() rider: Rider) {
    return this.notifService.markAllAsRead(rider);
  }
}
