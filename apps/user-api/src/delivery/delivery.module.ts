import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryRepository } from './repository';
import { RiderMatchingService } from './rider-matching.service';
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
  ItemCategory,
  ItemCategorySchema,
  SpecialHandling,
  SpecialHandlingSchema,
} from '@libs/database';
import { GatewayModule } from '@libs/common/modules/gateway';
import { NotificationModule } from '@libs/common/modules/notification';

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
      { name: ItemCategory.name, schema: ItemCategorySchema },
      { name: SpecialHandling.name, schema: SpecialHandlingSchema },
    ]),
    GatewayModule,
    NotificationModule,
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService, DeliveryRepository, RiderMatchingService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
