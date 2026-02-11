import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationRepository } from '@libs/database';
import { NotificationChannel, NotificationRecipientType } from '@libs/database';
import { EmailNotificationService } from './email-notification.service';
import { FirebaseNotificationService } from './firebase-notification.service';

interface SendNotificationInput {
  recipientId: string | Types.ObjectId;
  recipientType: NotificationRecipientType;
  title: string;
  token?: string;
  body: string;
  channels?: NotificationChannel[];
  data?: Record<string, any>;
  email?: string; // optional override
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly emailService: EmailNotificationService,
    private readonly firebaseService: FirebaseNotificationService,
  ) {}

  async send(input: SendNotificationInput) {
    const { recipientId, recipientType, title, body, channels = [NotificationChannel.FIREBASE], data, email } = input;

    // Persist notification record
    await this.notificationRepository.create({
      recipientId: recipientId instanceof Types.ObjectId ? recipientId : new Types.ObjectId(recipientId),
      recipientType,
      title,
      body,
      data,
      channels,
      isRead: false,
      email,
    });

    // Dispatch via channels
    await Promise.all(
      channels.map(async (ch) => {
        if (ch === NotificationChannel.EMAIL && email) {
          await this.emailService.sendEmail(email, title, body, data);
        }
        if (ch === NotificationChannel.FIREBASE && input?.token) {
          await this.firebaseService.sendFirebase(input?.token, title, body, {
            ...data,
            recipientId: recipientId instanceof Types.ObjectId ? recipientId.toString() : recipientId,
          });
        }
      }),
    );

    this.logger.log(`Notification sent to ${recipientId} via ${channels.join(',')}`);
  }
}
