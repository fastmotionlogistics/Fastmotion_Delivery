import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Rider, RiderDocument, DeliveryRequest, DeliveryRequestDocument } from '@libs/database';
import { DeliveryGateway } from '@libs/common/modules/gateway';
import { NotificationService } from '@libs/common/modules/notification';
import { NotificationRecipientType } from '@libs/database';

/**
 * RiderMatchingService
 *
 * Listens for `delivery.created.quick` events emitted when a quick delivery is created.
 * Finds nearby online/available riders and:
 *   1. Broadcasts a new delivery request via WebSocket to each rider
 *   2. Sends push notifications to each rider via FCM
 *
 * Riders then call `acceptDelivery()` from their app to claim the delivery.
 * First rider to accept wins (the accept endpoint checks if already assigned).
 */
@Injectable()
export class RiderMatchingService {
  private readonly logger = new Logger(RiderMatchingService.name);

  constructor(
    @InjectModel(Rider.name)
    private readonly riderModel: Model<RiderDocument>,
    @InjectModel(DeliveryRequest.name)
    private readonly deliveryModel: Model<DeliveryRequestDocument>,
    private readonly gateway: DeliveryGateway,
    private readonly notificationService: NotificationService,
  ) {}

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

      // Build the delivery request payload to send to riders
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
        createdAt: delivery.createdAt,
      };

      // Notify each rider via WebSocket and push notification
      for (const rider of nearbyRiders) {
        const riderId = rider._id.toString();

        // WS: emit directly to rider's socket(s)
        this.gateway.emitToUser(riderId, 'delivery:new_request', {
          ...requestPayload,
          distanceFromRider: rider.distanceKm,
        });

        // Push notification
        if (rider.fcmToken) {
          this.notificationService
            .send({
              recipientId: rider._id,
              recipientType: NotificationRecipientType.RIDER,
              title: 'New Delivery Request! 📦',
              body: `Pickup at ${pickupLocation.address || 'nearby location'} — ${rider.distanceKm.toFixed(1)}km away. ₦${delivery.pricing?.totalPrice?.toLocaleString()}`,
              token: rider.fcmToken,
              data: {
                type: 'new_delivery_request',
                deliveryId: deliveryIdStr,
                trackingNumber: delivery.trackingNumber,
              },
            })
            .catch((e) =>
              this.logger.warn(`Failed to push-notify rider ${riderId}: ${e.message}`),
            );
        }
      }

      this.logger.log(
        `Notified ${nearbyRiders.length} riders for delivery ${deliveryIdStr}`,
      );
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
}
