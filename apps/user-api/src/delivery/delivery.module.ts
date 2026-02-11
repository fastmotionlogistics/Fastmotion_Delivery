import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryRepository } from './repository';
import {
  DatabaseModule,
  DeliveryRequest,
  DeliveryRequestSchema,
  Coupon,
  CouponSchema,
  Payment,
  PaymentSchema,
  User,
  UserSchema,
  Wallet,
  WalletSchema,
  LocationZone,
  LocationZoneSchema,
  WeightPricing,
  WeightPricingSchema,
  TimePricing,
  TimePricingSchema,
  PricingConfig,
  PricingConfigSchema,
  Rider,
  RiderSchema,
} from '@libs/database';
import { GatewayModule } from '@libs/common/modules/gateway';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: DeliveryRequest.name, schema: DeliveryRequestSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: User.name, schema: UserSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: LocationZone.name, schema: LocationZoneSchema },
      { name: WeightPricing.name, schema: WeightPricingSchema },
      { name: TimePricing.name, schema: TimePricingSchema },
      { name: PricingConfig.name, schema: PricingConfigSchema },
      { name: Rider.name, schema: RiderSchema },
    ]),
    GatewayModule,
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService, DeliveryRepository],
  exports: [DeliveryService],
})
export class DeliveryModule {}
