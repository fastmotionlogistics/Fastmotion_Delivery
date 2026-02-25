import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AdminJwtAuthGuard } from './guards';
import { AdminJwtStrategy, AdminLocalStrategy, AdminJwtTokenService } from './strategies';
import { PermissionGuard } from './guards';
import { LoggerModule } from '@libs/common';
import { DatabaseModule, Admin, AdminSchema, RefreshToken, RefreshTokenSchema } from '@libs/database';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow('JWT_ASECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow('JWT_EXPIRATION'),
        },
      }),
      inject: [ConfigService],
    }),
    LoggerModule,
    DatabaseModule,
    DatabaseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AdminJwtStrategy,
    AdminLocalStrategy,
    AdminJwtTokenService,
    AuthService,
    AdminJwtAuthGuard,
    PermissionGuard,
  ],
  exports: [AuthService, AdminJwtAuthGuard, PermissionGuard],
})
export class AuthModule {}

// Re-export guards for use by other modules
export { AdminJwtAuthGuard, PermissionGuard, RequirePermissions, RequireRoles } from './guards';
export { CurrentAdmin } from './decorators/current-admin.decorator';
