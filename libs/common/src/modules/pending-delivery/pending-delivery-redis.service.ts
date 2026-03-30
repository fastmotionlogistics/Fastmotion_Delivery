import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

const PENDING_DELIVERY_PREFIX = 'fm:pending_delivery:';
const PENDING_DELIVERY_TTL_SEC = 30 * 60; // 30 minutes

export interface PendingDeliveryData {
  userId: string;
  deliveryType: string;
  paymentMethod: string;
  pickupLocation: Record<string, any>;
  dropoffLocation: Record<string, any>;
  parcelDetails: Record<string, any>;
  pricing: Record<string, any>; // full computeDeliveryPricing breakdown
  trackingNumber: string;
  estimatedDistance: number;
  estimatedDuration: number;
  pickupZoneId?: string;
  dropoffZoneId?: string;
  isInterZoneDelivery: boolean;
  timePricingAppliedId?: string;
}

@Injectable()
export class PendingDeliveryRedisService {
  private readonly logger = new Logger(PendingDeliveryRedisService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  private key(deliveryId: string): string {
    return `${PENDING_DELIVERY_PREFIX}${deliveryId}`;
  }

  async cache(deliveryId: string, data: PendingDeliveryData): Promise<void> {
    await this.redis.setex(this.key(deliveryId), PENDING_DELIVERY_TTL_SEC, JSON.stringify(data));
    this.logger.log(`Cached pending delivery ${deliveryId} (TTL: ${PENDING_DELIVERY_TTL_SEC}s)`);
  }

  async get(deliveryId: string): Promise<PendingDeliveryData | null> {
    try {
      const raw = await this.redis.get(this.key(deliveryId));
      return raw ? (JSON.parse(raw) as PendingDeliveryData) : null;
    } catch (err) {
      this.logger.warn(`Failed to get pending delivery ${deliveryId}: ${err?.message}`);
      return null;
    }
  }

  async delete(deliveryId: string): Promise<void> {
    await this.redis.del(this.key(deliveryId));
  }
}
