import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { FirebaseModule } from 'nestjs-firebase';
import { LoggerModule, ShutdownService } from '@libs/common';
import { DatabaseModule } from '@libs/database';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from './account/user.module';
import { MessageModule, MessageService } from '@libs/common/modules';
import { GatewayModule } from '@libs/common/modules/gateway';

// FastMotion Delivery Modules
import { DeliveryModule } from './delivery/delivery.module';
import { PaymentModule } from './payment/payment.module';
import { RatingModule } from './rating/rating.module';
import { DisputeModule } from './dispute/dispute.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    FirebaseModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return {
          googleApplicationCredential: {
            clientEmail: configService.get('FIREBASE_CLIENT_EMAIL'),
            privateKey: configService.get('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
            projectId: configService.get('FIREBASE_PROJECT_ID'),
          },
        };
      },
      inject: [ConfigService],
    }),

    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '_',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    ScheduleModule.forRoot(),
    MessageModule,
    DatabaseModule,
    LoggerModule,
    AuthModule,
    UserModule,
    // FastMotion Delivery Modules
    DeliveryModule,
    PaymentModule,
    RatingModule,
    DisputeModule,
    GatewayModule,
  ],
  providers: [ShutdownService],
})
export class AppModule {}
