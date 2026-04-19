import { Module } from '@nestjs/common';
import { AdminAppContentController } from './app-content.controller';
import { AdminAppContentService } from './app-content.service';
import { DatabaseModule, AppContent, AppContentSchema } from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: AppContent.name, schema: AppContentSchema },
    ]),
  ],
  controllers: [AdminAppContentController],
  providers: [AdminAppContentService],
})
export class AdminAppContentModule {}
