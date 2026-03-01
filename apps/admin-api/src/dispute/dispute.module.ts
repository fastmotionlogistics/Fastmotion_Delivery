import { Module } from '@nestjs/common';
import { AdminDisputeController } from './dispute.controller';
import { AdminDisputeService } from './dispute.service';
import { NotificationModule } from '@libs/common/modules/notification';
import {
  DatabaseModule,
  Dispute,
  DisputeSchema,
  User,
  UserSchema,
  Rider,
  RiderSchema,
  DeliveryRequest,
  DeliveryRequestSchema,
} from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Dispute.name, schema: DisputeSchema },
      { name: User.name, schema: UserSchema },
      { name: Rider.name, schema: RiderSchema },
      { name: DeliveryRequest.name, schema: DeliveryRequestSchema },
    ]),
    NotificationModule,
  ],
  controllers: [AdminDisputeController],
  providers: [AdminDisputeService],
})
export class AdminDisputeModule {}
