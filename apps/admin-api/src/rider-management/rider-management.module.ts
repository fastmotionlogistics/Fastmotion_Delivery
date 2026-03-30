import { Module } from '@nestjs/common';
import { RiderManagementController } from './rider-management.controller';
import { RiderManagementService } from './rider-management.service';
import {
  DatabaseModule,
  Rider,
  RiderSchema,
  Admin,
  AdminSchema,
  DeliveryRequest,
  DeliveryRequestSchema,
} from '@libs/database';
import { NotificationModule } from '@libs/common/modules/notification';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Rider.name, schema: RiderSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: DeliveryRequest.name, schema: DeliveryRequestSchema },
    ]),
    NotificationModule,
  ],
  controllers: [RiderManagementController],
  providers: [RiderManagementService],
  exports: [RiderManagementService],
})
export class RiderManagementModule {}
