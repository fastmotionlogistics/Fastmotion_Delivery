import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { WebhookController } from './webhook.controller';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './repository';
import {
  DatabaseModule,
  Payment,
  PaymentSchema,
  Wallet,
  WalletSchema,
  WalletTransaction,
  WalletTransactionSchema,
  User,
  UserSchema,
  DeliveryRequest,
  DeliveryRequestSchema,
} from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: DeliveryRequest.name, schema: DeliveryRequestSchema },
    ]),
  ],
  controllers: [PaymentController, WebhookController],
  providers: [PaymentService, PaymentRepository],
  exports: [PaymentService],
})
export class PaymentModule {}
