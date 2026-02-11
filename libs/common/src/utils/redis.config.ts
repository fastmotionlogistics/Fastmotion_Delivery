// config/redis.config.ts
import { registerAs } from '@nestjs/config';
import { RedisModuleOptions } from '@nestjs-modules/ioredis';

// export default registerAs('redis', () => ({
//   host: process.env.REDIS_HOST || 'localhost',
//   port: parseInt(process.env.REDIS_PORT, 10) || 6379,
//   password: process.env.REDIS_PASSWORD || '',
//   db: parseInt(process.env.REDIS_DB, 10) || 0,
//   ttl: parseInt(process.env.REDIS_TTL, 10) || 3600,
// }));

export const getRedisConfig = (): RedisModuleOptions => ({
  options: {
    db: parseInt(process.env.REDIS_CACHE_DB || '0'),
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    enableReadyCheck: true,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    disconnectTimeout: 2000,
    commandTimeout: 5000,

    // Keep alive
    keepAlive: 30000,

    // Connection pool
    maxRetriesPerRequest: 3,
  },
  type: 'single',

  // config: {
  //   host: process.env.REDIS_HOST || 'localhost',
  //   port: parseInt(process.env.REDIS_PORT || '6379'),
  //   password: process.env.REDIS_PASSWORD,
  //   db: parseInt(process.env.REDIS_CACHE_DB || '0'), // Use DB 0 for cache

  //   // Connection options
  //   retryStrategy: (times: number) => {
  //     const delay = Math.min(times * 50, 2000);
  //     return delay;
  //   },

  //   // Performance options
  //   enableReadyCheck: true,
  //   enableOfflineQueue: true,
  //   connectTimeout: 10000,
  //   disconnectTimeout: 2000,
  //   commandTimeout: 5000,

  //   // Keep alive
  //   keepAlive: 30000,

  //   // Connection pool
  //   maxRetriesPerRequest: 3,
  // },
});
