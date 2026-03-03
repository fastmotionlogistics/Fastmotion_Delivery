import { Module } from '@nestjs/common';
import { AdminNotificationController } from './notification.controller';
import { AdminNotificationService } from './notification.service';
import { NotificationModule } from '@libs/common/modules/notification';
import {
  DatabaseModule,
  User,
  UserSchema,
  Rider,
  RiderSchema,
  Notification,
  NotificationSchema,
} from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Rider.name, schema: RiderSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    NotificationModule,
  ],
  controllers: [AdminNotificationController],
  providers: [AdminNotificationService],
})
export class AdminNotificationModule {}
