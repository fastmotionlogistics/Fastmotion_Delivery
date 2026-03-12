import { Module } from '@nestjs/common';
import { EarningsController } from './earnings.controller';
import { EarningsService } from './earnings.service';
import {
  DatabaseModule,
  Rider,
  RiderSchema,
  RiderEarnings,
  RiderEarningsSchema,
  DeliveryRequest,
  DeliveryRequestSchema,
  PricingConfig,
  PricingConfigSchema,
  PlatformEarning,
  PlatformEarningSchema,
  WithdrawalRequest,
  WithdrawalRequestSchema,
} from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Rider.name, schema: RiderSchema },
      { name: RiderEarnings.name, schema: RiderEarningsSchema },
      { name: DeliveryRequest.name, schema: DeliveryRequestSchema },
      { name: PricingConfig.name, schema: PricingConfigSchema },
      { name: PlatformEarning.name, schema: PlatformEarningSchema },
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
    ]),
  ],
  controllers: [EarningsController],
  providers: [EarningsService],
  exports: [EarningsService],
})
export class EarningsModule {}
