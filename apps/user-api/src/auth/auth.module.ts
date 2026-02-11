import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ConfigModule, ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JwtModule, JwtService } from '@nestjs/jwt';

import { JwtStrategy, LocalStrategy } from './strategies';
import { LoggerModule } from '@libs/common';
import {
  DatabaseModule,
  RefreshToken,
  RefreshTokenSchema,
  User,
  UserSchema,
  Wallet,
  WalletSchema,
} from '@libs/database';
import { JwtTokenService } from './strategies/jwt.service';
import { AuthUserRepository, RefreshTokenRepository } from './repository';

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
      { name: User.name, schema: UserSchema },
      { name: Wallet.name, schema: WalletSchema },

      { name: RefreshToken.name, schema: RefreshTokenSchema },
      // { name: RefreshToken.name, schema: RefreshTokenSchema },
      // { name: Country.name, schema: CountrySchema },
      // { name: Wallet.name, schema: WalletSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, LocalStrategy, RefreshTokenRepository, AuthUserRepository, JwtTokenService, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
