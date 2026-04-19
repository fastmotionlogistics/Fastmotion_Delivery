import { Module } from '@nestjs/common';
import { AppContentController } from './app-content.controller';
import { DatabaseModule, AppContent, AppContentSchema } from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: AppContent.name, schema: AppContentSchema },
    ]),
  ],
  controllers: [AppContentController],
})
export class AppContentModule {}
