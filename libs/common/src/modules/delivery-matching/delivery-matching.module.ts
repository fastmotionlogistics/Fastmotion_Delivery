import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule } from '@nestjs/config';
import { getRedisConfig } from '@libs/common';
import { DeliveryMatchingRedisService } from './delivery-matching-redis.service';

@Module({
  imports: [
    ConfigModule,
    RedisModule.forRootAsync({
      useFactory: () => getRedisConfig(),
    }),
  ],
  providers: [DeliveryMatchingRedisService],
  exports: [DeliveryMatchingRedisService],
})
export class DeliveryMatchingModule {}
