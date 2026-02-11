import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EmailNotificationService } from './email-notification.service';
import { FirebaseNotificationService } from './firebase-notification.service';

@Module({
  providers: [NotificationService, EmailNotificationService, FirebaseNotificationService],
  exports: [NotificationService, EmailNotificationService, FirebaseNotificationService],
})
export class NotificationModule {}
