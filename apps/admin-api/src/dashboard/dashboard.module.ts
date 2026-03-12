import { Module } from '@nestjs/common';
import { DatabaseModule } from '@libs/database';
import {
  Rider,
  RiderSchema,
  User,
  UserSchema,
  DeliveryRequest,
  DeliveryRequestSchema,
  PlatformEarning,
  PlatformEarningSchema,
  WithdrawalRequest,
  WithdrawalRequestSchema,
  AuditLog,
  AuditLogSchema,
} from '@libs/database';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Rider.name, schema: RiderSchema },
      { name: User.name, schema: UserSchema },
      { name: DeliveryRequest.name, schema: DeliveryRequestSchema },
      { name: PlatformEarning.name, schema: PlatformEarningSchema },
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
