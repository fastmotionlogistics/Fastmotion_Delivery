import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Rider,
  RiderDocument,
  DeliveryRequest,
  DeliveryRequestDocument,
  PricingConfig,
  PricingConfigDocument,
} from '@libs/database';
import { DeliveryGateway } from '@libs/common/modules/gateway';
import { NotificationService } from '@libs/common/modules/notification';
import { NotificationRecipientType } from '@libs/database';
import { DeliveryStatusEnum, DeliveryPaymentStatusEnum } from '@libs/common';
import { DeliveryMatchingRedisService, REQUEST_TIMEOUT_SEC, MAX_RIDERS } from '@libs/common/modules/delivery-matching';

/**
 * RiderMatchingService
 *
 * Listens for `delivery.created.quick` events emitted when a quick delivery is created.
 * Sends delivery requests to riders ONE AT A TIME (max 10 riders):
 *   - If rider accepts -> delivery starts
 *   - If rider rejects -> next rider gets the request; rejector gets cooldown with customer
 *   - If rider doesn't respond in time -> next rider gets the request
 */
@Injectable()
export class RiderMatchingService implements OnModuleInit {
  private readonly logger = new Logger(RiderMatchingService.name);

  constructor(
    @InjectModel(Rider.name)
    private readonly riderModel: Model<RiderDocument>,
    @InjectModel(DeliveryRequest.name)
    private readonly deliveryModel: Model<DeliveryRequestDocument>,
    @InjectModel(PricingConfig.name)
    private readonly pricingModel: Model<PricingConfigDocument>,
    private readonly gateway: DeliveryGateway,
    private readonly notificationService: NotificationService,
    private readonly matchingRedis: DeliveryMatchingRedisService,
  ) {}

  /** Calculate rider payout after commission */
  private async computeRiderPayout(totalPrice: number): Promise<{ riderPayout: number; commissionRate: number }> {
    const config = await this.pricingModel
      .findOne({ isActive: true })
      .select('riderCommissionPercentage minimumRiderPayout')
      .lean();
    const rate = config?.riderCommissionPercentage ?? 0.8;
    const min = config?.minimumRiderPayout ?? 100;
    const riderPayout = Math.max(Math.round(totalPrice * rate), min);
    return { riderPayout, commissionRate: rate };
  }

  /**
   * Handle new quick delivery — find and notify nearby riders
   */
  @OnEvent('delivery.created.quick')
  async handleQuickDeliveryCreated(payload: {
    deliveryId: Types.ObjectId | string;
    pickupLocation: { latitude: string; longitude: string; address?: string };
  }) {
    const { deliveryId, pickupLocation } = payload;
    const deliveryIdStr = deliveryId.toString();

    this.logger.log(`Quick delivery created: ${deliveryIdStr} — searching for nearby riders`);

    try {
      const delivery = await this.deliveryModel.findById(deliveryId).lean();
      if (!delivery) {
        this.logger.warn(`Delivery ${deliveryIdStr} not found, skipping rider matching`);
        return;
      }

      // Find nearby online, verified, available riders
      const nearbyRiders = await this.findNearbyRiders(
        parseFloat(pickupLocation.latitude),
        parseFloat(pickupLocation.longitude),
        15, // 15km radius
      );

      this.logger.log(`Found ${nearbyRiders.length} nearby riders for delivery ${deliveryIdStr}`);

      const isPaid = delivery.paymentStatus === DeliveryPaymentStatusEnum.PAID || delivery.paymentStatus === 'paid';

      if (nearbyRiders.length === 0) {
        this.logger.warn(`No riders available for delivery ${deliveryIdStr}`);
        if (isPaid) {
          this.gateway.emitMatchingUpdate(deliveryIdStr, { type: 'exhausted_retrying' });
        } else {
          await this.handleUnpaidExhausted(deliveryIdStr, delivery);
        }
        return;
      }

      // Calculate rider payout (after commission deduction)
      const totalPrice = delivery.pricing?.totalPrice || 0;
      const { riderPayout, commissionRate } = await this.computeRiderPayout(totalPrice);

      const customerId = (delivery.customer as any)?.toString?.() || delivery.customer?.toString() || '';
      const riderIds = nearbyRiders.map((r) => r._id.toString());
      const filteredIds = await this.matchingRedis.filterByCooldown(riderIds, customerId);
      const riderList = nearbyRiders.filter((r) => filteredIds.includes(r._id.toString())).slice(0, MAX_RIDERS);

      if (riderList.length === 0) {
        this.logger.warn(`No riders available (after cooldown filter) for delivery ${deliveryIdStr}`);
        if (isPaid) {
          this.gateway.emitMatchingUpdate(deliveryIdStr, { type: 'exhausted_retrying' });
        } else {
          await this.handleUnpaidExhausted(deliveryIdStr, delivery);
        }
        return;
      }

      const idsToUse = riderList.map((r) => r._id.toString());
      const state = await this.matchingRedis.initMatchingState(deliveryIdStr, customerId, idsToUse);
      if (!state) return;

      const requestPayload = {
        deliveryId: deliveryIdStr,
        trackingNumber: delivery.trackingNumber,
        deliveryType: delivery.deliveryType,
        pickupLocation: delivery.pickupLocation,
        dropoffLocation: delivery.dropoffLocation,
        parcelDetails: {
          size: delivery.parcelDetails?.size,
          weight: delivery.parcelDetails?.weight,
          category: delivery.parcelDetails?.category,
          isFragile: delivery.parcelDetails?.isFragile,
        },
        estimatedDistance: delivery.estimatedDistance,
        estimatedDuration: delivery.estimatedDuration,
        pricing: {
          totalPrice: delivery.pricing?.totalPrice,
          currency: delivery.pricing?.currency || 'NGN',
        },
        riderPayout,
        commissionRate,
        createdAt: delivery.createdAt,
      };

      await this.sendRequestToRider(riderList[0], requestPayload, pickupLocation, riderPayout, 1, riderList.length);
      this.logger.log(`Sent request to rider 1/${riderList.length} for delivery ${deliveryIdStr}`);
    } catch (error) {
      this.logger.error(`Rider matching failed for delivery ${deliveryIdStr}: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle payment confirmed for quick delivery — broadcast to nearby riders
   * This covers the flow: create delivery → pay → PAYMENT_CONFIRMED → search for riders
   */
  @OnEvent('payment.completed')
  async handlePaymentCompleted(payload: {
    deliveryId: Types.ObjectId | string;
    userId: Types.ObjectId | string;
    amount: number;
    method: string;
  }) {
    const { deliveryId } = payload;
    const delivery = await this.deliveryModel.findById(deliveryId).lean();

    if (!delivery) return;

    // Only for quick deliveries that are in PAYMENT_CONFIRMED and have no rider yet
    if (delivery.deliveryType === 'quick' && delivery.status === 'payment_confirmed' && !delivery.rider) {
      this.logger.log(
        `Payment confirmed for quick delivery ${deliveryId} — updating to SEARCHING_RIDER and broadcasting`,
      );

      // Update status to SEARCHING_RIDER
      await this.deliveryModel.findByIdAndUpdate(deliveryId, {
        $set: { status: 'searching_rider' },
      });

      // Broadcast the status change to the customer
      this.gateway.emitDeliveryStatusUpdate(deliveryId.toString(), 'searching_rider', { paymentStatus: 'paid' });

      // Now broadcast to nearby riders
      await this.handleQuickDeliveryCreated({
        deliveryId,
        pickupLocation: delivery.pickupLocation,
      });
    }
  }

  /**
   * Find online, verified, available riders within radius of a location
   */
  private async findNearbyRiders(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<Array<RiderDocument & { distanceKm: number }>> {
    // Find all online, verified, available riders with location data
    const riders = await this.riderModel
      .find({
        isOnline: true,
        verificationStatus: 'verified',
        isSuspended: { $ne: true },
        isActive: true,
        currentLatitude: { $exists: true, $ne: null },
        currentLongitude: { $exists: true, $ne: null },
        // Rider must have capacity
        $expr: { $lt: ['$currentDeliveryCount', '$maxConcurrentDeliveries'] },
      })
      .select(
        'firstName lastName fcmToken currentLatitude currentLongitude maxConcurrentDeliveries currentDeliveryCount',
      )
      .lean();

    // Filter by distance
    const nearbyRiders = riders
      .map((rider) => {
        const distance = this.calculateDistance(
          lat,
          lng,
          parseFloat(rider.currentLatitude),
          parseFloat(rider.currentLongitude),
        );
        return { ...rider, distanceKm: distance } as unknown as RiderDocument & { distanceKm: number };
      })
      .filter((r) => r.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return nearbyRiders;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /** Send delivery request to a single rider via WS and FCM, then notify the customer of progress */
  private async sendRequestToRider(
    rider: RiderDocument & { distanceKm: number },
    requestPayload: Record<string, any>,
    pickupLocation: { address?: string },
    riderPayout: number,
    riderIndex: number,   // 1-based position in the queue
    totalRiders: number,
  ): Promise<void> {
    const riderId = rider._id.toString();
    const deliveryId = requestPayload.deliveryId as string;

    // Notify the rider
    this.gateway.emitToUser(riderId, 'delivery:new_request', {
      ...requestPayload,
      distanceFromRider: rider.distanceKm,
    });
    if (rider.fcmToken) {
      this.notificationService
        .send({
          recipientId: rider._id,
          recipientType: NotificationRecipientType.RIDER,
          title: 'New Delivery Request! 📦',
          body: `Pickup at ${pickupLocation.address || 'nearby location'} — ${rider.distanceKm.toFixed(
            1,
          )}km away. Earn ₦${riderPayout.toLocaleString()}`,
          token: rider.fcmToken,
          data: {
            type: 'new_delivery_request',
            deliveryId,
            trackingNumber: requestPayload.trackingNumber || '',
            deliveryType: requestPayload.deliveryType || 'quick',
            pickupAddress: requestPayload.pickupLocation?.address || '',
            dropoffAddress: requestPayload.dropoffLocation?.address || '',
            estimatedDistance: String(requestPayload.estimatedDistance || ''),
            estimatedDuration: String(requestPayload.estimatedDuration || ''),
            riderPayout: String(riderPayout),
            totalPrice: String(requestPayload.pricing?.totalPrice || 0),
            distanceFromRider: String(rider.distanceKm.toFixed(2)),
          },
        })
        .catch((e) => this.logger.warn(`Failed to push-notify rider ${riderId}: ${e.message}`));
    }

    // Notify the customer watching this delivery
    this.gateway.emitMatchingUpdate(deliveryId, {
      type: 'request_sent',
      riderIndex,
      totalRiders,
      timeoutSecs: REQUEST_TIMEOUT_SEC,
    });
  }

  /** Handle unpaid delivery when all riders exhausted: cancel and delete */
  private async handleUnpaidExhausted(
    deliveryIdStr: string,
    delivery: { customer?: any; trackingNumber?: string },
  ): Promise<void> {
    await this.matchingRedis.deleteMatchingState(deliveryIdStr);

    // Notify customer before cancelling so the UI can react
    this.gateway.emitMatchingUpdate(deliveryIdStr, { type: 'exhausted_cancelled' });

    await this.deliveryModel.findByIdAndUpdate(deliveryIdStr, {
      $set: {
        status: DeliveryStatusEnum.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: 'system',
        cancellationReason: 'No riders available',
      },
    });
    this.gateway.emitDeliveryStatusUpdate(deliveryIdStr, DeliveryStatusEnum.CANCELLED, {
      cancelledBy: 'system',
    });
    this.gateway.emitSystemChatMessage(deliveryIdStr, 'No riders were available. Your request has been cancelled.');
    const customerId = (delivery.customer as any)?.toString?.() || delivery.customer?.toString?.();
    if (customerId) {
      this.notificationService
        .send({
          recipientId: customerId,
          recipientType: NotificationRecipientType.USER,
          title: 'Request Cancelled',
          body: `No riders were available for your delivery. Your request has been cancelled.`,
          data: { type: 'delivery_cancelled', deliveryId: deliveryIdStr, trackingNumber: delivery.trackingNumber },
        })
        .catch(() => {});
    }
    await this.deliveryModel.findByIdAndDelete(new Types.ObjectId(deliveryIdStr));
    this.logger.log(`Cancelled and deleted unpaid delivery ${deliveryIdStr} (riders exhausted)`);
  }

  /** Advance to next rider and send request (called on reject or timeout) */
  private async advanceToNextRiderAndNotify(
    deliveryIdStr: string,
    reason: 'rejected' | 'timeout' = 'rejected',
  ): Promise<void> {
    const delivery = await this.deliveryModel.findById(deliveryIdStr).lean();
    if (!delivery || delivery.rider) return; // Already assigned

    // Emit what just happened (rejection or timeout) before advancing
    const prevState = await this.matchingRedis.getMatchingState(deliveryIdStr);
    if (prevState) {
      this.gateway.emitMatchingUpdate(deliveryIdStr, {
        type: reason === 'timeout' ? 'request_timeout' : 'request_rejected',
        riderIndex: prevState.riderIndex + 1, // 1-based
        totalRiders: prevState.riderIds.length,
      });
    }

    const state = await this.matchingRedis.advanceToNextRider(deliveryIdStr);
    if (!state) {
      this.logger.log(`All riders exhausted for delivery ${deliveryIdStr}`);
      const isPaid = delivery.paymentStatus === DeliveryPaymentStatusEnum.PAID || delivery.paymentStatus === 'paid';
      if (isPaid) {
        // Paid: clear Redis so retry cron can re-init; do not cancel
        await this.matchingRedis.deleteMatchingState(deliveryIdStr);
        this.gateway.emitMatchingUpdate(deliveryIdStr, { type: 'exhausted_retrying' });
      } else {
        // Unpaid: cancel and delete the request
        await this.handleUnpaidExhausted(deliveryIdStr, delivery);
      }
      return;
    }
    const nextRiderId = state.riderIds[state.riderIndex];
    const rider = await this.riderModel.findById(nextRiderId).lean();
    if (!rider) return;
    const distanceKm = this.calculateDistance(
      parseFloat(delivery.pickupLocation.latitude),
      parseFloat(delivery.pickupLocation.longitude),
      parseFloat(rider.currentLatitude),
      parseFloat(rider.currentLongitude),
    );
    const totalPrice = delivery.pricing?.totalPrice || 0;
    const { riderPayout, commissionRate } = await this.computeRiderPayout(totalPrice);
    const requestPayload = {
      deliveryId: deliveryIdStr,
      trackingNumber: delivery.trackingNumber,
      deliveryType: delivery.deliveryType,
      pickupLocation: delivery.pickupLocation,
      dropoffLocation: delivery.dropoffLocation,
      parcelDetails: delivery.parcelDetails,
      estimatedDistance: delivery.estimatedDistance,
      estimatedDuration: delivery.estimatedDuration,
      pricing: delivery.pricing,
      riderPayout,
      commissionRate,
      createdAt: delivery.createdAt,
    };
    const riderWithDist = { ...rider, distanceKm } as unknown as RiderDocument & { distanceKm: number };
    await this.sendRequestToRider(
      riderWithDist, requestPayload, delivery.pickupLocation, riderPayout,
      state.riderIndex + 1,   // 1-based
      state.riderIds.length,
    );
    this.logger.log(`Advanced to rider ${state.riderIndex + 1}/${state.riderIds.length} for delivery ${deliveryIdStr}`);
  }

  onModuleInit() {
    this.matchingRedis.onMatchingEvent(async (event) => {
      if (event.type === 'rider_rejected' && event.deliveryId && event.riderId && event.customerId) {
        await this.matchingRedis.setCooldown(event.riderId, event.customerId);
        await this.advanceToNextRiderAndNotify(event.deliveryId, 'rejected');
      }
      if (event.type === 'rider_accepted' && event.deliveryId) {
        await this.matchingRedis.deleteMatchingState(event.deliveryId);
      }
    });
  }

  @Interval(10000) // Every 10 seconds
  async checkMatchingTimeouts() {
    const ids = await this.matchingRedis.getActiveMatchingDeliveryIds();
    const now = Date.now();
    const timeoutMs = REQUEST_TIMEOUT_SEC * 1000;
    for (const deliveryId of ids) {
      const state = await this.matchingRedis.getMatchingState(deliveryId);
      if (!state || state.status !== 'active') continue;
      if (now - state.sentAt >= timeoutMs) {
        this.logger.log(`Rider timeout for delivery ${deliveryId}, advancing to next`);
        await this.advanceToNextRiderAndNotify(deliveryId, 'timeout');
      }
    }
  }

  /** Every 2.5 min: retry rider matching for paid deliveries that exhausted all riders */
  @Interval(150000) // 2.5 minutes
  async retryPaidExhaustedDeliveries() {
    try {
      const deliveries = await this.deliveryModel
        .find({
          status: DeliveryStatusEnum.SEARCHING_RIDER,
          paymentStatus: DeliveryPaymentStatusEnum.PAID,
          $or: [{ rider: null }, { rider: { $exists: false } }],
          deliveryType: 'quick',
        })
        .select('_id pickupLocation')
        .lean();

      for (const d of deliveries) {
        const deliveryIdStr = d._id.toString();
        const hasActiveMatching = await this.matchingRedis.getMatchingState(deliveryIdStr);
        if (hasActiveMatching) continue; // Still in active matching, skip
        this.logger.log(`Retrying rider match for paid delivery ${deliveryIdStr}`);
        await this.handleQuickDeliveryCreated({
          deliveryId: d._id,
          pickupLocation: d.pickupLocation,
        });
      }
    } catch (e) {
      this.logger.warn(`retryPaidExhaustedDeliveries error: ${e?.message || e}`);
    }
  }
}
