import { Module } from '@nestjs/common';
import { AppVersionController } from './app-version.controller';
import { DatabaseModule, AppVersion, AppVersionSchema } from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: AppVersion.name, schema: AppVersionSchema },
    ]),
  ],
  controllers: [AppVersionController],
})
export class AppVersionModule {}
