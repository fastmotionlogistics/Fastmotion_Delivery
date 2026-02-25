import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule, MessageModule, ShutdownService } from '@libs/common';
import { DatabaseModule } from '@libs/database';
import { FirebaseModule } from 'nestjs-firebase';

// FastMotion Admin Modules
import { AuthModule } from './auth/auth.module';
import { PricingModule } from './pricing/pricing.module';
import { DeliveryModule } from './delivery/delivery.module';
import { RiderManagementModule } from './rider-management/rider-management.module';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.getOrThrow('JWT_ASECRET'),
          signOptions: {
            expiresIn: `${configService.getOrThrow('JWT_EXPIRATION')}`,
          },
        };
      },
      inject: [ConfigService],
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
    MessageModule,
    DatabaseModule,
    LoggerModule,
    HttpModule,
    ScheduleModule.forRoot(),

    // FastMotion Admin Modules
    AuthModule,
    PricingModule,
    DeliveryModule,
    RiderManagementModule,
    CatalogModule,
  ],
  providers: [ShutdownService],
})
export class AdminModule {}
