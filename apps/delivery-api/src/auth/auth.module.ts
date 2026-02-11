import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy, LocalStrategy, JwtTokenService } from './strategies';
import { LoggerModule } from '@libs/common';
import {
  DatabaseModule,
  Rider,
  RiderSchema,
  RefreshToken,
  RefreshTokenSchema,
} from '@libs/database';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.getOrThrow('JWT_SECRET'),
          signOptions: {
            expiresIn: `${configService.getOrThrow('JWT_EXPIRATION')}`,
          },
        };
      },
      inject: [ConfigService],
    }),
    LoggerModule,
    DatabaseModule,
    DatabaseModule.forFeature([
      { name: Rider.name, schema: RiderSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, LocalStrategy, JwtTokenService, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
