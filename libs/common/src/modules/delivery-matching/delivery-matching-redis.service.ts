import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

/** Redis channel for delivery matching events (rider_rejected, rider_accepted) */
export const MATCHING_CHANNEL = 'fm:delivery:matching:events';

/** Key prefix for matching state */
const MATCHING_PREFIX = 'fm:matching:';

/** Key prefix for rider-customer cooldown */
const COOLDOWN_PREFIX = 'fm:cooldown:';

/** Set of active delivery IDs being matched */
const ACTIVE_IDS_KEY = 'fm:matching:ids';

/** Cooldown TTL in seconds (5 minutes) */
export const COOLDOWN_TTL_SEC = 300;

/** Request timeout in seconds (no response from rider) */
export const REQUEST_TIMEOUT_SEC = 55;

/** Max riders to try per delivery */
export const MAX_RIDERS = 10;

export interface MatchingState {
  deliveryId: string;
  riderIds: string[];
  riderIndex: number;
  customerId: string;
  sentAt: number;
  status: 'active' | 'accepted' | 'exhausted';
}

export type MatchingEventType = 'rider_rejected' | 'rider_accepted';

export interface MatchingEvent {
  type: MatchingEventType;
  deliveryId: string;
  riderId?: string;
  customerId?: string;
}

@Injectable()
export class DeliveryMatchingRedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeliveryMatchingRedisService.name);
  private subscriber: Redis | null = null;

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async onModuleInit() {
    try {
      this.subscriber = this.redis.duplicate();
      await this.subscriber.subscribe(MATCHING_CHANNEL);
      this.logger.log('Delivery matching Redis subscriber ready');
    } catch (e) {
      this.logger.warn(`Delivery matching Redis subscriber init failed: ${e?.message || e}`);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.subscriber) {
        await this.subscriber.unsubscribe(MATCHING_CHANNEL);
        this.subscriber.disconnect();
      }
    } catch (_) {}
  }

  matchingKey(deliveryId: string): string {
    return `${MATCHING_PREFIX}${deliveryId}`;
  }

  cooldownKey(riderId: string, customerId: string): string {
    return `${COOLDOWN_PREFIX}${riderId}:${customerId}`;
  }

  /** Subscribe to matching events */
  onMatchingEvent(handler: (event: MatchingEvent) => void | Promise<void>) {
    if (!this.subscriber) return;
    this.subscriber.on('message', (channel, message) => {
      if (channel !== MATCHING_CHANNEL) return;
      try {
        const event = JSON.parse(message) as MatchingEvent;
        Promise.resolve(handler(event)).catch((e) =>
          this.logger.warn(`Matching event handler error: ${e?.message || e}`),
        );
      } catch (e) {
        this.logger.warn(`Failed to parse matching event: ${e?.message || e}`);
      }
    });
  }

  /** Publish a matching event */
  async publishEvent(event: MatchingEvent): Promise<void> {
    await this.redis.publish(MATCHING_CHANNEL, JSON.stringify(event));
  }

  /** Set cooldown for rider-customer pair */
  async setCooldown(riderId: string, customerId: string): Promise<void> {
    const key = this.cooldownKey(riderId, customerId);
    await this.redis.setex(key, COOLDOWN_TTL_SEC, '1');
  }

  /** Check if rider is in cooldown for this customer */
  async isInCooldown(riderId: string, customerId: string): Promise<boolean> {
    const key = this.cooldownKey(riderId, customerId);
    const v = await this.redis.get(key);
    return v === '1';
  }

  /** Initialize matching state and return first rider index (0) */
  async initMatchingState(
    deliveryId: string,
    customerId: string,
    riderIds: string[],
  ): Promise<MatchingState | null> {
    if (riderIds.length === 0) return null;
    const state: MatchingState = {
      deliveryId,
      riderIds,
      riderIndex: 0,
      customerId,
      sentAt: Date.now(),
      status: 'active',
    };
    const key = this.matchingKey(deliveryId);
    await this.redis.hset(key, {
      riderIds: JSON.stringify(riderIds),
      riderIndex: '0',
      customerId,
      sentAt: String(state.sentAt),
      status: 'active',
    });
    await this.redis.expire(key, 3600);
    await this.redis.sadd(ACTIVE_IDS_KEY, deliveryId);
    return state;
  }

  /** Get matching state */
  async getMatchingState(deliveryId: string): Promise<MatchingState | null> {
    const key = this.matchingKey(deliveryId);
    const data = await this.redis.hgetall(key);
    if (!data?.riderIds) return null;
    return {
      deliveryId,
      riderIds: JSON.parse(data.riderIds),
      riderIndex: parseInt(data.riderIndex || '0', 10),
      customerId: data.customerId || '',
      sentAt: parseInt(data.sentAt || '0', 10),
      status: (data.status as MatchingState['status']) || 'active',
    };
  }

  /** Advance to next rider and return new state (or null if exhausted) */
  async advanceToNextRider(deliveryId: string): Promise<MatchingState | null> {
    const state = await this.getMatchingState(deliveryId);
    if (!state || state.status !== 'active') return null;
    const nextIndex = state.riderIndex + 1;
    if (nextIndex >= state.riderIds.length) {
      await this.redis.hset(this.matchingKey(deliveryId), 'status', 'exhausted');
      await this.redis.srem(ACTIVE_IDS_KEY, deliveryId);
      return null;
    }
    await this.redis.hset(this.matchingKey(deliveryId), {
      riderIndex: String(nextIndex),
      sentAt: String(Date.now()),
    });
    return { ...state, riderIndex: nextIndex, sentAt: Date.now() };
  }

  /** Mark matching as accepted (stop trying more riders) */
  async markAccepted(deliveryId: string): Promise<void> {
    await this.redis.hset(this.matchingKey(deliveryId), 'status', 'accepted');
    await this.redis.srem(ACTIVE_IDS_KEY, deliveryId);
  }

  /** Delete matching state (cleanup) */
  async deleteMatchingState(deliveryId: string): Promise<void> {
    await this.redis.del(this.matchingKey(deliveryId));
    await this.redis.srem(ACTIVE_IDS_KEY, deliveryId);
  }

  /** Get all active delivery IDs being matched (for timeout check) */
  async getActiveMatchingDeliveryIds(): Promise<string[]> {
    const ids = await this.redis.smembers(ACTIVE_IDS_KEY);
    return ids || [];
  }

  /** Filter rider IDs to exclude those in cooldown for this customer */
  async filterByCooldown(riderIds: string[], customerId: string): Promise<string[]> {
    const filtered: string[] = [];
    for (const rid of riderIds) {
      const inCooldown = await this.isInCooldown(rid, customerId);
      if (!inCooldown) filtered.push(rid);
    }
    return filtered;
  }
}
