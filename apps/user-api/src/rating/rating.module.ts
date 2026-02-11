import { Module } from '@nestjs/common';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { RatingRepository } from './repository';
import {
  DatabaseModule,
  Rating,
  RatingSchema,
  DeliveryRequest,
  DeliveryRequestSchema,
  Rider,
  RiderSchema,
  User,
  UserSchema,
} from '@libs/database';

@Module({
  imports: [
    DatabaseModule.forFeature([
      { name: Rating.name, schema: RatingSchema },
      { name: DeliveryRequest.name, schema: DeliveryRequestSchema },
      { name: Rider.name, schema: RiderSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [RatingController],
  providers: [RatingService, RatingRepository],
  exports: [RatingService],
})
export class RatingModule {}
