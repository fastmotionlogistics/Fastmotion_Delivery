import { Module } from '@nestjs/common';
import { AdminEarningsController } from './earnings.controller';
import { AdminEarningsService } from './earnings.service';
import {
  DatabaseModule,
  PlatformEarning,
  PlatformEarningSchema,
  RiderEarnings,
  RiderEarningsSchema,
  Payment,
  PaymentSchema,
  DeliveryRequest,
  DeliveryRequestSchema,
} from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: PlatformEarning.name, schema: PlatformEarningSchema },
      { name: RiderEarnings.name, schema: RiderEarningsSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: DeliveryRequest.name, schema: DeliveryRequestSchema },
    ]),
  ],
  controllers: [AdminEarningsController],
  providers: [AdminEarningsService],
  exports: [AdminEarningsService],
})
export class AdminEarningsModule {}
