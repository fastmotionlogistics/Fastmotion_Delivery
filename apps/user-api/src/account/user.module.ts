import { forwardRef, Module } from '@nestjs/common';
import { AccountService } from './user.service';
import { AccountController } from './user.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule, User, UserSchema } from '@libs/database';
import { HttpModule } from '@nestjs/axios';
import { UploadFileService } from '@libs/common';
import { AccountUserRepository } from './repository';

@Module({
  imports: [
    DatabaseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    HttpModule,

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
    // WalletsModule,
  ],
  controllers: [AccountController],
  providers: [AccountService, AccountUserRepository, UploadFileService],
  exports: [AccountService],
})
export class UserModule {}
