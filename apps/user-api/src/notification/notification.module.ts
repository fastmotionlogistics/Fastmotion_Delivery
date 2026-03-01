import { Module } from '@nestjs/common';
import { UserNotificationController } from './notification.controller';
import { UserNotificationService } from './notification.service';
import { NotificationModule } from '@libs/common/modules/notification';

@Module({
  imports: [NotificationModule],
  controllers: [UserNotificationController],
  providers: [UserNotificationService],
  exports: [UserNotificationService],
})
export class UserNotificationModule {}
