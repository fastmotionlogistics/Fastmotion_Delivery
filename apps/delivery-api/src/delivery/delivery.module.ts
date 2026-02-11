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
} from '@libs/database';
import { GatewayModule } from '@libs/common/modules/gateway';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: DeliveryRequest.name, schema: DeliveryRequestSchema },
      { name: Rider.name, schema: RiderSchema },
      { name: User.name, schema: UserSchema },
    ]),
    GatewayModule,
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
