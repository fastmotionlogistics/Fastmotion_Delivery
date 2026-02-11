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

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: DeliveryRequest.name, schema: DeliveryRequestSchema },
      { name: Rider.name, schema: RiderSchema },
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Dispute.name, schema: DisputeSchema },
    ]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
