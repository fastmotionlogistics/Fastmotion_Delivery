import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { Rider, NotificationRepository } from '@libs/database';

@Injectable()
export class RiderNotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async getNotifications(
    rider: Rider,
    filters: { page?: number; limit?: number; unreadOnly?: boolean },
  ) {
    const { page = 1, limit = 30, unreadOnly = false } = filters;

    const { data, total } = await this.notificationRepository.findByRecipient(
      new Types.ObjectId(rider._id as any),
      {
        page,
        limit,
        isRead: unreadOnly ? false : undefined,
      },
    );

    return {
      success: true,
      message: 'Notifications retrieved',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount: unreadOnly
          ? total
          : await this.notificationRepository.getUnreadCount(
              new Types.ObjectId(rider._id as any),
            ),
      },
    };
  }

  async getUnreadCount(rider: Rider) {
    const count = await this.notificationRepository.getUnreadCount(
      new Types.ObjectId(rider._id as any),
    );
    return {
      success: true,
      message: 'Unread count retrieved',
      data: { unreadCount: count },
    };
  }

  async markAsRead(rider: Rider, notificationId: string) {
    await this.notificationRepository.markAsRead(notificationId);
    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  async markAllAsRead(rider: Rider) {
    await this.notificationRepository.markAllAsRead(
      new Types.ObjectId(rider._id as any),
    );
    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }
}
