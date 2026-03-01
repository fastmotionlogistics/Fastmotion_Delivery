import { Module } from '@nestjs/common';
import { AdminAppVersionController } from './app-version.controller';
import { AdminAppVersionService } from './app-version.service';
import { DatabaseModule, AppVersion, AppVersionSchema } from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: AppVersion.name, schema: AppVersionSchema },
    ]),
  ],
  controllers: [AdminAppVersionController],
  providers: [AdminAppVersionService],
})
export class AdminAppVersionModule {}
