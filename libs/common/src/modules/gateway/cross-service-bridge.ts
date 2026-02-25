import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * CrossServiceBridge
 *
 * Uses Redis pub/sub so that WebSocket events emitted on one service
 * (e.g. delivery-api) are replayed on all other services (e.g. user-api)
 * that share the same DeliveryGateway code.
 *
 * Channel: `ws:cross_service`
 * Message format: JSON { event, room, data }
 */

const CHANNEL = 'ws:cross_service';

export type CrossServiceMessage = {
  event: string;
  room: string;
  data: any;
  sourceService?: string;
};

@Injectable()
export class CrossServiceBridge implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CrossServiceBridge.name);

  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;

  // External handler set by DeliveryGateway
  private onMessageHandler: ((msg: CrossServiceMessage) => void) | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const redisHost = this.configService.get('REDIS_HOST') || 'localhost';
      const redisPort = parseInt(this.configService.get('REDIS_PORT') || '6379', 10);
      const redisPassword = this.configService.get('REDIS_PASSWORD') || undefined;

      const opts = {
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        retryStrategy: (times: number) => Math.min(times * 100, 3000),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      };

      this.publisher = new Redis(opts);
      this.subscriber = new Redis(opts);

      await this.publisher.connect();
      await this.subscriber.connect();

      // Subscribe to the cross-service channel
      await this.subscriber.subscribe(CHANNEL);

      this.subscriber.on('message', (channel, message) => {
        if (channel !== CHANNEL) return;
        try {
          const parsed: CrossServiceMessage = JSON.parse(message);
          if (this.onMessageHandler) {
            this.onMessageHandler(parsed);
          }
        } catch (e) {
          this.logger.warn(`Failed to parse cross-service message: ${e.message}`);
        }
      });

      this.logger.log('Cross-service Redis bridge initialized');
    } catch (err) {
      this.logger.warn(`Cross-service bridge init failed (WS will work locally only): ${err.message}`);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.subscriber) {
        await this.subscriber.unsubscribe(CHANNEL);
        this.subscriber.disconnect();
      }
      if (this.publisher) {
        this.publisher.disconnect();
      }
    } catch (_) {}
  }

  /**
   * Publish a WS event to all services via Redis
   */
  publish(event: string, room: string, data: any, sourceService?: string) {
    if (!this.publisher) return;
    const msg: CrossServiceMessage = { event, room, data, sourceService };
    this.publisher.publish(CHANNEL, JSON.stringify(msg)).catch((e) => {
      this.logger.warn(`Redis publish failed: ${e.message}`);
    });
  }

  /**
   * Register a handler for incoming cross-service messages
   * (called by DeliveryGateway to forward events to local WS rooms)
   */
  setMessageHandler(handler: (msg: CrossServiceMessage) => void) {
    this.onMessageHandler = handler;
  }
}
