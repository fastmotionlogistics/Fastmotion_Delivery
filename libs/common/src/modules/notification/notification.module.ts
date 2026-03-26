import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { EmailNotificationService } from './email-notification.service';
import { FirebaseNotificationService } from './firebase-notification.service';
import { NotificationRepository } from '@libs/database';
import {
  DatabaseModule,
  Notification,
  NotificationSchema,
} from '@libs/database';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    DatabaseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  providers: [NotificationService, EmailNotificationService, FirebaseNotificationService, NotificationRepository],
  exports: [NotificationService, EmailNotificationService, FirebaseNotificationService, NotificationRepository],
})
export class NotificationModule {}
