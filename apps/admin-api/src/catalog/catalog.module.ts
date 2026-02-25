import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import {
  DatabaseModule,
  ItemCategory,
  ItemCategorySchema,
  SpecialHandling,
  SpecialHandlingSchema,
} from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: ItemCategory.name, schema: ItemCategorySchema },
      { name: SpecialHandling.name, schema: SpecialHandlingSchema },
    ]),
  ],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
