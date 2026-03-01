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
  PricingConfig,
  PricingConfigSchema,
} from '@libs/database';
import { GatewayModule } from '@libs/common/modules/gateway';
import { NotificationModule } from '@libs/common/modules/notification';
import { EarningsModule } from '../earnings/earnings.module';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: DeliveryRequest.name, schema: DeliveryRequestSchema },
      { name: Rider.name, schema: RiderSchema },
      { name: User.name, schema: UserSchema },
      { name: PricingConfig.name, schema: PricingConfigSchema },
    ]),
    GatewayModule,
    NotificationModule,
    EarningsModule,
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
