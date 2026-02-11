import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import {
  DatabaseModule,
  Rider,
  RiderSchema,
} from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Rider.name, schema: RiderSchema },
    ]),
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
