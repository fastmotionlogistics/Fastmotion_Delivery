import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Rider, RiderDocument, DeliveryRequest, DeliveryRequestDocument, PricingConfig, PricingConfigDocument } from '@libs/database';
import { DeliveryGateway } from '@libs/common/modules/gateway';
import { NotificationService } from '@libs/common/modules/notification';
import { NotificationRecipientType } from '@libs/database';
import {
  DeliveryMatchingRedisService,
  REQUEST_TIMEOUT_SEC,
  MAX_RIDERS,
} from '@libs/common/modules/delivery-matching';

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
    const config = await this.pricingModel.findOne({ isActive: true }).select('riderCommissionPercentage minimumRiderPayout').lean();
    const rate = config?.riderCommissionPercentage ?? 0.80;
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

      if (nearbyRiders.length === 0) {
        this.logger.warn(`No riders available for delivery ${deliveryIdStr}`);
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

      await this.sendRequestToRider(riderList[0], requestPayload, pickupLocation, riderPayout);
      this.logger.log(`Sent request to rider 1/${riderList.length} for delivery ${deliveryIdStr}`);
    } catch (error) {
      this.logger.error(
        `Rider matching failed for delivery ${deliveryIdStr}: ${error.message}`,
        error.stack,
      );
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
    if (
      delivery.deliveryType === 'quick' &&
      delivery.status === 'payment_confirmed' &&
      !delivery.rider
    ) {
      this.logger.log(
        `Payment confirmed for quick delivery ${deliveryId} — updating to SEARCHING_RIDER and broadcasting`,
      );

      // Update status to SEARCHING_RIDER
      await this.deliveryModel.findByIdAndUpdate(deliveryId, {
        $set: { status: 'searching_rider' },
      });

      // Broadcast the status change to the customer
      this.gateway.emitDeliveryStatusUpdate(
        deliveryId.toString(),
        'searching_rider',
        { paymentStatus: 'paid' },
      );

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
      .select('firstName lastName fcmToken currentLatitude currentLongitude maxConcurrentDeliveries currentDeliveryCount')
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
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /** Send delivery request to a single rider via WS and FCM */
  private async sendRequestToRider(
    rider: RiderDocument & { distanceKm: number },
    requestPayload: Record<string, any>,
    pickupLocation: { address?: string },
    riderPayout: number,
  ): Promise<void> {
    const riderId = rider._id.toString();
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
          body: `Pickup at ${pickupLocation.address || 'nearby location'} — ${rider.distanceKm.toFixed(1)}km away. Earn ₦${riderPayout.toLocaleString()}`,
          token: rider.fcmToken,
          data: {
            type: 'new_delivery_request',
            deliveryId: requestPayload.deliveryId,
            trackingNumber: requestPayload.trackingNumber,
          },
        })
        .catch((e) => this.logger.warn(`Failed to push-notify rider ${riderId}: ${e.message}`));
    }
  }

  /** Advance to next rider and send request (called on reject or timeout) */
  private async advanceToNextRiderAndNotify(deliveryIdStr: string): Promise<void> {
    const delivery = await this.deliveryModel.findById(deliveryIdStr).lean();
    if (!delivery || delivery.rider) return; // Already assigned
    const state = await this.matchingRedis.advanceToNextRider(deliveryIdStr);
    if (!state) {
      this.logger.log(`All riders exhausted for delivery ${deliveryIdStr}`);
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
    await this.sendRequestToRider(riderWithDist, requestPayload, delivery.pickupLocation, riderPayout);
    this.logger.log(`Advanced to rider ${state.riderIndex + 1}/${state.riderIds.length} for delivery ${deliveryIdStr}`);
  }

  onModuleInit() {
    this.matchingRedis.onMatchingEvent(async (event) => {
      if (event.type === 'rider_rejected' && event.deliveryId && event.riderId && event.customerId) {
        await this.matchingRedis.setCooldown(event.riderId, event.customerId);
        await this.advanceToNextRiderAndNotify(event.deliveryId);
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
        await this.advanceToNextRiderAndNotify(deliveryId);
      }
    }
  }
}
