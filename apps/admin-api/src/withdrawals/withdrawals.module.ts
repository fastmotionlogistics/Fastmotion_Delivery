import { Module } from '@nestjs/common';
import { WithdrawalsController } from './withdrawals.controller';
import { WithdrawalsService } from './withdrawals.service';
import {
  DatabaseModule,
  WithdrawalRequest,
  WithdrawalRequestSchema,
  RiderEarnings,
  RiderEarningsSchema,
  Rider,
  RiderSchema,
} from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
      { name: RiderEarnings.name, schema: RiderEarningsSchema },
      { name: Rider.name, schema: RiderSchema },
    ]),
  ],
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService],
})
export class WithdrawalsModule {}
