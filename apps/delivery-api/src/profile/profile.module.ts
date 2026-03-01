import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import {
  DatabaseModule,
  Rider,
  RiderSchema,
} from '@libs/database';
import { MonnifyModule } from '@libs/common/modules/monnify';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Rider.name, schema: RiderSchema },
    ]),
    MonnifyModule,
    HttpModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
