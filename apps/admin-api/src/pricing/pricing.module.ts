import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import {
  DatabaseModule,
  PricingConfig,
  PricingConfigSchema,
  LocationZone,
  LocationZoneSchema,
  WeightPricing,
  WeightPricingSchema,
  TimePricing,
  TimePricingSchema,
} from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: PricingConfig.name, schema: PricingConfigSchema },
      { name: LocationZone.name, schema: LocationZoneSchema },
      { name: WeightPricing.name, schema: WeightPricingSchema },
      { name: TimePricing.name, schema: TimePricingSchema },
    ]),
  ],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
