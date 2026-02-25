import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import {
  DatabaseModule,
  DeliveryRequest,
  DeliveryRequestSchema,
  Rider,
  RiderSchema,
  User,
  UserSchema,
  Payment,
  PaymentSchema,
  Dispute,
  DisputeSchema,
} from '@libs/database';
import { NotificationModule } from '@libs/common/modules/notification';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: DeliveryRequest.name, schema: DeliveryRequestSchema },
      { name: Rider.name, schema: RiderSchema },
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Dispute.name, schema: DisputeSchema },
    ]),
    NotificationModule,
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
