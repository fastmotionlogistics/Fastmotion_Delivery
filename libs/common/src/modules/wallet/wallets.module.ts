import { Module, forwardRef } from '@nestjs/common';
import { WalletsController } from './wallets.controller';

import { HttpModule } from '@nestjs/axios';

import { PaymentService } from './payment.service';
import { TransactionService } from './transaction.service';
import { WalletsService } from './wallets.service';
import {
  DatabaseModule,
  WalletTransaction,
  WalletTransactionSchema,
  User,
  UserSchema,
  Wallet,
  WalletSchema,
} from '../../../../database/src';
import { WalletRepository } from './repository/wallet.repository';

@Module({
  imports: [
    HttpModule,
    DatabaseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: User.name, schema: UserSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
    // forwardRef(() => SettingsModule),
  ],
  controllers: [WalletsController],
  providers: [
    WalletsService,
    TransactionService,
    WalletRepository,
    // TransactionRepository,
    PaymentService,
  ],
  exports: [WalletsService, TransactionService],
})
export class WalletsModule {}
