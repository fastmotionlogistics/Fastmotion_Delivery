import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  User,
  UserDocument,
  Rider,
  RiderDocument,
  Notification,
  NotificationDocument,
  NotificationChannel,
  NotificationRecipientType,
} from '@libs/database';
import { NotificationService } from '@libs/common/modules/notification';
import {
  SendNotificationDto,
  BroadcastNotificationDto,
  NotifChannel,
  NotifTargetType,
  NotificationFilterDto,
} from './dto';

@Injectable()
export class AdminNotificationService {
  private readonly logger = new Logger(AdminNotificationService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Rider.name) private readonly riderModel: Model<RiderDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  // ═══════════════════════════════════════════════
  //  SEND TO SINGLE RECIPIENT
  // ═══════════════════════════════════════════════

  async sendNotification(dto: SendNotificationDto) {
    const { recipientId, targetType, title, body, channel = NotifChannel.PUSH } = dto;
    const channels = this.resolveChannels(channel);

    let token: string | undefined;
    let email: string | undefined;
    let recipientType: NotificationRecipientType;

    if (targetType === NotifTargetType.USER) {
      const user = await this.userModel.findById(recipientId).select('firstName lastName email deviceToken').lean();
      if (!user) throw new NotFoundException('User not found');
      token = (user as any).deviceToken;
      email = user.email;
      recipientType = NotificationRecipientType.USER;
    } else {
      const rider = await this.riderModel.findById(recipientId).select('firstName lastName email fcmToken').lean();
      if (!rider) throw new NotFoundException('Rider not found');
      token = rider.fcmToken;
      email = rider.email;
      recipientType = NotificationRecipientType.RIDER;
    }

    await this.notificationService.send({
      recipientId: new Types.ObjectId(recipientId),
      recipientType,
      title,
      body,
      token,
      channels,
      email,
      data: { type: 'admin_notification' },
    });

    return {
      success: true,
      message: `Notification sent to ${targetType}`,
      data: { recipientId, channels },
    };
  }

  // ═══════════════════════════════════════════════
  //  BROADCAST
  // ═══════════════════════════════════════════════

  async broadcastNotification(dto: BroadcastNotificationDto) {
    const { title, body, audience, channel = NotifChannel.PUSH } = dto;
    const channels = this.resolveChannels(channel);
    let sentCount = 0;

    const sendToUsers = audience === 'users' || audience === 'all';
    const sendToRiders = audience === 'riders' || audience === 'all';

    if (sendToUsers) {
      const users = await this.userModel
        .find({ email: { $exists: true } })
        .select('email deviceToken')
        .lean();

      for (const user of users) {
        try {
          await this.notificationService.send({
            recipientId: user._id as Types.ObjectId,
            recipientType: NotificationRecipientType.USER,
            title,
            body,
            token: (user as any).deviceToken,
            channels,
            email: user.email,
            data: { type: 'broadcast' },
          });
          sentCount++;
        } catch (err) {
          this.logger.warn(`Failed to notify user ${user._id}: ${err.message}`);
        }
      }
    }

    if (sendToRiders) {
      const riders = await this.riderModel
        .find({ isActive: true })
        .select('email fcmToken')
        .lean();

      for (const rider of riders) {
        try {
          await this.notificationService.send({
            recipientId: rider._id as Types.ObjectId,
            recipientType: NotificationRecipientType.RIDER,
            title,
            body,
            token: rider.fcmToken,
            channels,
            email: rider.email,
            data: { type: 'broadcast' },
          });
          sentCount++;
        } catch (err) {
          this.logger.warn(`Failed to notify rider ${rider._id}: ${err.message}`);
        }
      }
    }

    return {
      success: true,
      message: `Broadcast sent to ${sentCount} recipients`,
      data: { audience, sentCount },
    };
  }

  // ═══════════════════════════════════════════════
  //  NOTIFICATION HISTORY
  // ═══════════════════════════════════════════════

  async getNotificationHistory(filters: NotificationFilterDto) {
    const { targetType, page = 1, limit = 20 } = filters;
    const query: any = {};

    if (targetType) {
      query.recipientType = targetType === NotifTargetType.USER
        ? NotificationRecipientType.USER
        : NotificationRecipientType.RIDER;
    }

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(query),
    ]);

    return {
      success: true,
      message: 'Notification history retrieved',
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ═══════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════

  private resolveChannels(channel: NotifChannel): NotificationChannel[] {
    switch (channel) {
      case NotifChannel.EMAIL:
        return [NotificationChannel.EMAIL];
      case NotifChannel.BOTH:
        return [NotificationChannel.FIREBASE, NotificationChannel.EMAIL];
      default:
        return [NotificationChannel.FIREBASE];
    }
  }
}
