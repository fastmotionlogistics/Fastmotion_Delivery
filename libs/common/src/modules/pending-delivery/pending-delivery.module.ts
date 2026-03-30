import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { getRedisConfig } from '../../utils/redis.config';
import { PendingDeliveryRedisService } from './pending-delivery-redis.service';

@Module({
  imports: [
    ConfigModule,
    RedisModule.forRootAsync({
      useFactory: () => getRedisConfig(),
    }),
  ],
  providers: [PendingDeliveryRedisService],
  exports: [PendingDeliveryRedisService],
})
export class PendingDeliveryModule {}
