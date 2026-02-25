import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(data: Partial<Notification>): Promise<Notification> {
    const notification = new this.notificationModel({
      ...data,
      _id: new Types.ObjectId(),
    });
    return notification.save();
  }

  async findByRecipient(
    recipientId: Types.ObjectId,
    filters: { page?: number; limit?: number; isRead?: boolean } = {},
  ) {
    const { page = 1, limit = 20, isRead } = filters;
    const query: any = { recipientId };
    if (isRead !== undefined) query.isRead = isRead;

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async markAsRead(id: string | Types.ObjectId): Promise<void> {
    await this.notificationModel.updateOne(
      { _id: id },
      { $set: { isRead: true, readAt: new Date() } },
    );
  }

  async markAllAsRead(recipientId: Types.ObjectId): Promise<void> {
    await this.notificationModel.updateMany(
      { recipientId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
  }

  async getUnreadCount(recipientId: Types.ObjectId): Promise<number> {
    return this.notificationModel.countDocuments({ recipientId, isRead: false });
  }
}
