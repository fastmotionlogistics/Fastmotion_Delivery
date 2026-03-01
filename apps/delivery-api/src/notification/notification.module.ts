import { Module } from '@nestjs/common';
import { RiderNotificationController } from './notification.controller';
import { RiderNotificationService } from './notification.service';
import { NotificationModule } from '@libs/common/modules/notification';

@Module({
  imports: [NotificationModule],
  controllers: [RiderNotificationController],
  providers: [RiderNotificationService],
  exports: [RiderNotificationService],
})
export class RiderNotificationModule {}
