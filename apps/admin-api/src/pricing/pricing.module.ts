import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { GeoZoneModule } from '@libs/common';
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
  AuditLog,
  AuditLogSchema,
} from '@libs/database';

@Module({
  imports: [
    GeoZoneModule,
    DatabaseModule.forFeature([
      { name: PricingConfig.name, schema: PricingConfigSchema },
      { name: LocationZone.name, schema: LocationZoneSchema },
      { name: WeightPricing.name, schema: WeightPricingSchema },
      { name: TimePricing.name, schema: TimePricingSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
