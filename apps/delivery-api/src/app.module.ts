import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { FirebaseModule } from 'nestjs-firebase';
import { LoggerModule, ShutdownService } from '@libs/common';
import { DatabaseModule } from '@libs/database';
import { MessageModule } from '@libs/common/modules';
import { GatewayModule } from '@libs/common/modules/gateway';
import { MonnifyModule } from '@libs/common/modules/monnify';

// FastMotion Delivery Modules
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { DeliveryModule } from './delivery/delivery.module';
import { EarningsModule } from './earnings/earnings.module';
import { RiderNotificationModule } from './notification/notification.module';
import { AppVersionModule } from './app-version/app-version.module';

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
            privateKey: configService.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
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
    HttpModule,

    // FastMotion Delivery Modules
    AuthModule,
    ProfileModule,
    DeliveryModule,
    EarningsModule,
    RiderNotificationModule,
    AppVersionModule,
    GatewayModule,
    MonnifyModule,
  ],
  providers: [ShutdownService],
})
export class AppModule {}
