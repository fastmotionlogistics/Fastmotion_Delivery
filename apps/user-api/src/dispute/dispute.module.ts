import { Module } from '@nestjs/common';
import { DisputeController } from './dispute.controller';
import { DisputeService } from './dispute.service';
import { DisputeRepository } from './repository';
import {
  DatabaseModule,
  Dispute,
  DisputeSchema,
  DeliveryRequest,
  DeliveryRequestSchema,
  User,
  UserSchema,
  Rider,
  RiderSchema,
  Payment,
  PaymentSchema,
} from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Dispute.name, schema: DisputeSchema },
      { name: DeliveryRequest.name, schema: DeliveryRequestSchema },
      { name: User.name, schema: UserSchema },
      { name: Rider.name, schema: RiderSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [DisputeController],
  providers: [DisputeService, DisputeRepository],
  exports: [DisputeService],
})
export class DisputeModule {}
