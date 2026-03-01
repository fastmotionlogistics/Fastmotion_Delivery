import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { User } from '@libs/database';
import { CurrentUser, JwtAuthGuard, SetRolesMetaData } from '@libs/auth';
import { Role } from '@libs/common';
import { UserNotificationService } from './notification.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserNotificationController {
  constructor(private readonly notifService: UserNotificationService) {}

  @Get()
  @SetRolesMetaData(Role.NORMAL_USER)
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'unreadOnly', required: false })
  async getNotifications(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notifService.getNotifications(user, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 30,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  @SetRolesMetaData(Role.NORMAL_USER)
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() user: User) {
    return this.notifService.getUnreadCount(user);
  }

  @Patch(':id/read')
  @SetRolesMetaData(Role.NORMAL_USER)
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notifService.markAsRead(user, id);
  }

  @Patch('read-all')
  @SetRolesMetaData(Role.NORMAL_USER)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: User) {
    return this.notifService.markAllAsRead(user);
  }
}
