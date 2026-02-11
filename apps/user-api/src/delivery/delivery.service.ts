import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from '@libs/database';
import {
  DeliveryStatusEnum,
  DeliveryTypeEnum,
  DeliveryPaymentStatusEnum,
} from '@libs/common';
import { DeliveryRepository } from './repository';
import {
  CreateDeliveryRequestDto,
  RescheduleDeliveryDto,
  CancelDeliveryDto,
  InitiatePickupPaymentDto,
  ConfirmPaymentDto,
  ConfirmReschedulePaymentDto,
} from './dto';
import { DeliveryGateway } from '@libs/common/modules/gateway';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly deliveryRepository: DeliveryRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly gateway: DeliveryGateway,
  ) {}

  async createDeliveryRequest(user: User, body: CreateDeliveryRequestDto) {
    // Calculate pricing
    const pricing = await this.calculatePricing(body);

    // Generate tracking number
    const trackingNumber = this.deliveryRepository.generateTrackingNumber();

    // Determine initial status and payment requirements based on delivery type
    const isQuickDelivery = body.deliveryType === DeliveryTypeEnum.QUICK;

    // For scheduled delivery, validate scheduled time
    if (!isQuickDelivery && !body.scheduledPickupTime) {
      throw new BadRequestException('Scheduled pickup time is required for scheduled deliveries');
    }

    // PRD 7.2: Scheduled deliveries require upfront payment reference
    // Quick deliveries pay at pickup
    const initialStatus = isQuickDelivery
      ? DeliveryStatusEnum.SEARCHING_RIDER
      : body.paymentReference
        ? DeliveryStatusEnum.SCHEDULED
        : DeliveryStatusEnum.PENDING;

    // Create delivery request
    const delivery = await this.deliveryRepository.create({
      trackingNumber,
      customer: user._id,
      deliveryType: body.deliveryType,
      status: initialStatus,
      pickupLocation: body.pickupLocation,
      dropoffLocation: body.dropoffLocation,
      parcelDetails: {
        description: body.parcelDetails.description,
        size: body.parcelDetails.size,
        weight: body.parcelDetails.weight,
        quantity: body.parcelDetails.quantity || 1,
        isFragile: body.parcelDetails.isFragile || false,
        category: body.parcelDetails.category,
        declaredValue: body.parcelDetails.declaredValue,
      },
      estimatedDistance: pricing.estimatedDistance,
      estimatedDuration: pricing.estimatedDuration,
      pricing: pricing.breakdown,
      paymentStatus: (isQuickDelivery || !body.paymentReference)
        ? DeliveryPaymentStatusEnum.PENDING
        : DeliveryPaymentStatusEnum.PAID,
      scheduledPickupTime: body.scheduledPickupTime
        ? new Date(body.scheduledPickupTime)
        : undefined,
      paymentRequiredAtPickup: isQuickDelivery,
      canReschedule: true,
      pickupZone: pricing.pickupZone?._id,
      dropoffZone: pricing.dropoffZone?._id,
      isInterZoneDelivery: pricing.isInterZone,
      weightPricingApplied: pricing.weightPricing?._id,
      timePricingApplied: pricing.timePricing?._id,
    });

    // Emit event for rider matching (quick delivery) or notification (scheduled)
    if (isQuickDelivery) {
      this.eventEmitter.emit('delivery.created.quick', {
        deliveryId: delivery._id,
        pickupLocation: body.pickupLocation,
      });
    } else {
      this.eventEmitter.emit('delivery.created.scheduled', {
        deliveryId: delivery._id,
        scheduledTime: body.scheduledPickupTime,
      });
    }

    // WS: broadcast new delivery status
    this.gateway.emitDeliveryStatusUpdate(
      delivery._id.toString(),
      initialStatus,
      { trackingNumber, deliveryType: body.deliveryType },
    );

    return {
      success: true,
      message: isQuickDelivery
        ? 'Delivery request created. Searching for nearby riders...'
        : 'Scheduled delivery created. You will be notified when a rider is assigned.',
      data: {
        id: delivery._id,
        trackingNumber: delivery.trackingNumber,
        status: delivery.status,
        deliveryType: delivery.deliveryType,
        estimatedPrice: pricing.breakdown.totalPrice,
        estimatedDistance: pricing.estimatedDistance,
        estimatedDuration: pricing.estimatedDuration,
        paymentRequiredAtPickup: isQuickDelivery,
        scheduledPickupTime: delivery.scheduledPickupTime,
      },
    };
  }

  async getDeliveryEstimate(user: User, body: CreateDeliveryRequestDto) {
    const pricing = await this.calculatePricing(body);

    return {
      success: true,
      message: 'Delivery estimate retrieved',
      data: {
        estimatedDistance: pricing.estimatedDistance,
        estimatedDuration: pricing.estimatedDuration,
        pricing: {
          basePrice: pricing.breakdown.basePrice,
          distancePrice: pricing.breakdown.distancePrice,
          weightPrice: pricing.breakdown.weightPrice,
          timeMultiplierPrice: pricing.breakdown.timeMultiplierPrice,
          zoneMultiplierPrice: pricing.breakdown.zoneMultiplierPrice,
          serviceFee: pricing.breakdown.serviceFee,
          discountAmount: pricing.breakdown.discountAmount,
          subtotal: pricing.breakdown.subtotal,
          totalPrice: pricing.breakdown.totalPrice,
          currency: pricing.breakdown.currency,
        },
        multipliers: {
          zone: pricing.breakdown.zoneMultiplier,
          weight: pricing.breakdown.weightMultiplier,
          time: pricing.breakdown.timeMultiplier,
          deliveryType: pricing.breakdown.deliveryTypeMultiplier,
        },
        couponApplied: pricing.coupon
          ? { code: pricing.coupon.code, discount: pricing.breakdown.discountAmount }
          : null,
        pickupZone: pricing.pickupZone?.name,
        dropoffZone: pricing.dropoffZone?.name,
        isInterZoneDelivery: pricing.isInterZone,
      },
    };
  }

  async getMyDeliveries(
    user: User,
    filters: { status?: string; page?: number; limit?: number },
  ) {
    const { data, total } = await this.deliveryRepository.findByCustomer(
      user._id,
      filters,
    );

    return {
      success: true,
      message: 'Deliveries retrieved',
      data,
      pagination: {
        total,
        page: filters.page || 1,
        limit: filters.limit || 20,
        totalPages: Math.ceil(total / (filters.limit || 20)),
      },
    };
  }

  async getDeliveryById(user: User, id: string) {
    const delivery = await this.deliveryRepository.findByIdWithRelations(id, [
      'rider',
      'rating',
      'dispute',
    ]);

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.customer.toString() !== user._id.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    return {
      success: true,
      message: 'Delivery retrieved',
      data: delivery,
    };
  }

  async trackDelivery(user: User, id: string) {
    const delivery = await this.deliveryRepository.findByIdWithRelations(id, ['rider']);

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.customer.toString() !== user._id.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    // Get rider's current location if assigned
    let riderLocation = null;
    let estimatedArrival = null;

    if (delivery.rider) {
      const rider = await this.deliveryRepository.findRiderPublicInfo(
        delivery.rider as unknown as Types.ObjectId,
      );
      if (rider && rider.currentLatitude && rider.currentLongitude) {
        riderLocation = {
          latitude: rider.currentLatitude,
          longitude: rider.currentLongitude,
        };

        // Calculate ETA based on current position
        const targetLocation =
          delivery.status === DeliveryStatusEnum.IN_TRANSIT
            ? delivery.dropoffLocation
            : delivery.pickupLocation;

        const distance = this.deliveryRepository.calculateDistance(
          parseFloat(rider.currentLatitude),
          parseFloat(rider.currentLongitude),
          parseFloat(targetLocation.latitude),
          parseFloat(targetLocation.longitude),
        );
        estimatedArrival = `${Math.ceil(distance * 2)} mins`; // Rough estimate
      }
    }

    return {
      success: true,
      message: 'Tracking data retrieved',
      data: {
        deliveryId: delivery._id,
        trackingNumber: delivery.trackingNumber,
        status: delivery.status,
        riderLocation,
        estimatedArrival,
        pickupLocation: delivery.pickupLocation,
        dropoffLocation: delivery.dropoffLocation,
        timestamps: {
          createdAt: delivery.createdAt,
          riderAcceptedAt: delivery.riderAcceptedAt,
          arrivedAtPickupAt: delivery.arrivedAtPickupAt,
          pickedUpAt: delivery.pickedUpAt,
          arrivedAtDropoffAt: delivery.arrivedAtDropoffAt,
          deliveredAt: delivery.deliveredAt,
        },
      },
    };
  }

  async getPickupPin(user: User, id: string) {
    const delivery = await this.deliveryRepository.findByIdWithPins(id);

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.customer.toString() !== user._id.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    // PIN is only available after payment is confirmed
    if (delivery.paymentStatus !== DeliveryPaymentStatusEnum.PAID) {
      throw new BadRequestException('Payment must be confirmed before accessing pickup PIN');
    }

    // PIN is only available when rider has arrived
    const validStatuses = [
      DeliveryStatusEnum.RIDER_ARRIVED_PICKUP,
      DeliveryStatusEnum.PAYMENT_CONFIRMED,
      DeliveryStatusEnum.PICKUP_IN_PROGRESS,
    ];

    if (!validStatuses.includes(delivery.status as DeliveryStatusEnum)) {
      throw new BadRequestException('Pickup PIN is not available at this stage');
    }

    return {
      success: true,
      message: 'Pickup PIN retrieved',
      data: {
        pickupPin: delivery.pickupPin,
        instruction: 'Share this PIN with the rider to confirm pickup',
      },
    };
  }

  async getDeliveryPin(user: User, id: string) {
    const delivery = await this.deliveryRepository.findByIdWithPins(id);

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.customer.toString() !== user._id.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    // Delivery PIN is available after pickup
    const validStatuses = [
      DeliveryStatusEnum.IN_TRANSIT,
      DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF,
      DeliveryStatusEnum.DELIVERY_IN_PROGRESS,
    ];

    if (!validStatuses.includes(delivery.status as DeliveryStatusEnum)) {
      throw new BadRequestException('Delivery PIN is not available at this stage');
    }

    return {
      success: true,
      message: 'Delivery PIN retrieved',
      data: {
        deliveryPin: delivery.deliveryPin,
        instruction: 'Share this PIN with the rider to confirm delivery',
      },
    };
  }

  async rescheduleDelivery(user: User, id: string, body: RescheduleDeliveryDto) {
    const delivery = await this.deliveryRepository.findById(id);

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.customer.toString() !== user._id.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    // Check if rescheduling is allowed
    if (!delivery.canReschedule) {
      throw new BadRequestException('This delivery cannot be rescheduled');
    }

    // Calculate new pricing for the new time
    const newScheduledTime = new Date(body.newScheduledPickupTime);
    const newTimePricing = await this.deliveryRepository.findTimePricing(newScheduledTime);

    const currentPrice = delivery.pricing.totalPrice;
    let newPrice = currentPrice;
    let priceDifference = 0;

    if (newTimePricing) {
      // Recalculate with new time multiplier
      const baseWithoutTime =
        currentPrice / (delivery.pricing.timeMultiplier || 1);
      newPrice = Math.round(baseWithoutTime * newTimePricing.priceMultiplier);
      priceDifference = newPrice - currentPrice;
    }

    // If price increased, require additional payment
    if (priceDifference > 0) {
      return {
        success: true,
        message: 'Additional payment required for rescheduling',
        data: {
          requiresAdditionalPayment: true,
          currentPrice,
          newPrice,
          priceDifference,
          newScheduledTime: body.newScheduledPickupTime,
        },
      };
    }

    // No additional payment needed, proceed with rescheduling
    const previousScheduledTime = delivery.scheduledPickupTime;

    await this.deliveryRepository.addRescheduleHistory(id, {
      previousScheduledTime,
      newScheduledTime,
      additionalPayment: 0,
      reason: body.reason,
      rescheduledAt: new Date(),
    });

    await this.deliveryRepository.updateById(id, {
      scheduledPickupTime: newScheduledTime,
      timePricingApplied: newTimePricing?._id,
    });

    // Notify rider if assigned
    if (delivery.rider) {
      this.eventEmitter.emit('delivery.rescheduled', {
        deliveryId: id,
        riderId: delivery.rider,
        newScheduledTime,
      });
    }

    return {
      success: true,
      message: 'Delivery rescheduled successfully',
      data: {
        newScheduledTime: body.newScheduledPickupTime,
        priceDifference: 0,
      },
    };
  }

  async cancelDelivery(user: User, id: string, body: CancelDeliveryDto) {
    const delivery = await this.deliveryRepository.findById(id);

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.customer.toString() !== user._id.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    // Check if cancellation is allowed
    const nonCancellableStatuses = [
      DeliveryStatusEnum.DELIVERED,
      DeliveryStatusEnum.COMPLETED,
      DeliveryStatusEnum.CANCELLED,
    ];

    if (nonCancellableStatuses.includes(delivery.status as DeliveryStatusEnum)) {
      throw new BadRequestException('This delivery cannot be cancelled');
    }

    // Determine cancellation fee and refund
    let cancellationFee = 0;
    let refundAmount = 0;
    const pricingConfig = await this.deliveryRepository.getActivePricingConfig();

    if (delivery.paymentStatus === DeliveryPaymentStatusEnum.PAID) {
      const totalPaid = delivery.pricing.totalPrice;

      if (
        delivery.status === DeliveryStatusEnum.PENDING ||
        delivery.status === DeliveryStatusEnum.SEARCHING_RIDER
      ) {
        // Before rider accepts - minimal or no fee
        cancellationFee = pricingConfig?.cancellationFeeBeforeAccept || 0;
      } else if (
        [
          DeliveryStatusEnum.RIDER_ACCEPTED,
          DeliveryStatusEnum.RIDER_ASSIGNED,
          DeliveryStatusEnum.RIDER_EN_ROUTE_PICKUP,
        ].includes(delivery.status as DeliveryStatusEnum)
      ) {
        // After rider accepts but before pickup
        cancellationFee = pricingConfig?.cancellationFeeAfterAccept || 0;
      } else {
        // After pickup - percentage-based fee
        const percentage = pricingConfig?.cancellationFeeAfterPickupPercentage || 0.5;
        cancellationFee = Math.round(totalPaid * percentage);
      }

      refundAmount = totalPaid - cancellationFee;
    }

    // Update delivery status
    await this.deliveryRepository.updateStatus(id, DeliveryStatusEnum.CANCELLED, {
      cancelledAt: new Date(),
      cancellationReason: body.reason,
      cancelledBy: 'customer',
    });

    // WS: broadcast cancellation
    this.gateway.emitDeliveryStatusUpdate(id, DeliveryStatusEnum.CANCELLED, {
      cancelledBy: 'customer',
    });
    this.gateway.emitSystemChatMessage(id, 'Delivery has been cancelled by the customer.');

    // Process refund if applicable
    if (refundAmount > 0) {
      this.eventEmitter.emit('delivery.refund.requested', {
        deliveryId: id,
        customerId: user._id,
        amount: refundAmount,
        reason: 'Customer cancellation',
      });
    }

    // Notify rider if assigned
    if (delivery.rider) {
      this.eventEmitter.emit('delivery.cancelled', {
        deliveryId: id,
        riderId: delivery.rider,
        cancelledBy: 'customer',
        reason: body.reason,
      });
    }

    return {
      success: true,
      message: 'Delivery cancelled successfully',
      data: {
        cancellationFee,
        refundAmount,
        refundStatus: refundAmount > 0 ? 'processing' : 'not_applicable',
      },
    };
  }

  async getDeliveryHistory(user: User, filters: { page?: number; limit?: number }) {
    const { data, total } = await this.deliveryRepository.findCompletedByCustomer(
      user._id,
      filters,
    );

    return {
      success: true,
      message: 'Delivery history retrieved',
      data,
      pagination: {
        total,
        page: filters.page || 1,
        limit: filters.limit || 20,
        totalPages: Math.ceil(total / (filters.limit || 20)),
      },
    };
  }

  // ============ Quick Delivery Payment at Pickup Flow ============

  async initiatePickupPayment(user: User, id: string, body: InitiatePickupPaymentDto) {
    const delivery = await this.deliveryRepository.findById(id);

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.customer.toString() !== user._id.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    // Verify this is a quick delivery
    if (delivery.deliveryType !== DeliveryTypeEnum.QUICK) {
      throw new BadRequestException('This endpoint is only for quick deliveries');
    }

    // Verify rider has arrived at pickup
    if (delivery.status !== DeliveryStatusEnum.RIDER_ARRIVED_PICKUP) {
      throw new BadRequestException('Payment can only be initiated when rider has arrived at pickup');
    }

    // Verify payment hasn't been made
    if (delivery.paymentStatus === DeliveryPaymentStatusEnum.PAID) {
      throw new BadRequestException('Payment has already been completed');
    }

    const amount = delivery.pricing.totalPrice;
    const paymentReference = `PAY-${delivery.trackingNumber}-${Date.now()}`;

    // Update delivery with payment request info
    await this.deliveryRepository.updateById(id, {
      paymentMethod: body.paymentMethod,
      paymentRequestedAt: new Date(),
      status: DeliveryStatusEnum.AWAITING_PAYMENT,
    });

    // WS: broadcast awaiting payment status
    this.gateway.emitDeliveryStatusUpdate(id, DeliveryStatusEnum.AWAITING_PAYMENT, {
      paymentStatus: 'pending',
    });

    // Emit event for payment processing
    this.eventEmitter.emit('payment.initiate', {
      deliveryId: id,
      customerId: user._id,
      amount,
      paymentMethod: body.paymentMethod,
      paymentReference,
    });

    return {
      success: true,
      message: 'Payment initiated',
      data: {
        paymentReference,
        amount,
        currency: delivery.pricing.currency,
        paymentMethod: body.paymentMethod,
        // paymentUrl would be populated by payment service for card/bank
      },
    };
  }

  async confirmPickupPayment(user: User, id: string, body: ConfirmPaymentDto) {
    const delivery = await this.deliveryRepository.findById(id);

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.customer.toString() !== user._id.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    if (delivery.status !== DeliveryStatusEnum.AWAITING_PAYMENT) {
      throw new BadRequestException('Invalid delivery status for payment confirmation');
    }

    // Generate pickup PIN
    const pickupPin = this.deliveryRepository.generatePin();
    const deliveryPin = this.deliveryRepository.generatePin();

    // Update delivery
    await this.deliveryRepository.updateById(id, {
      paymentStatus: DeliveryPaymentStatusEnum.PAID,
      status: DeliveryStatusEnum.PAYMENT_CONFIRMED,
      pickupPin,
      deliveryPin,
    });

    // WS: broadcast payment confirmed + status
    this.gateway.emitDeliveryStatusUpdate(id, DeliveryStatusEnum.PAYMENT_CONFIRMED, {
      paymentStatus: 'paid',
    });
    this.gateway.emitSystemChatMessage(id, 'Payment confirmed. Customer can now share the pickup PIN.');

    // Notify rider that payment is confirmed
    this.eventEmitter.emit('delivery.payment.confirmed', {
      deliveryId: id,
      riderId: delivery.rider,
    });

    return {
      success: true,
      message: 'Payment confirmed. You can now share the pickup PIN with the rider.',
      data: {
        pickupPin,
        instruction: 'Share this PIN with the rider to start the pickup',
      },
    };
  }

  // ============ Rescheduling with Price Adjustment ============

  async previewReschedule(user: User, id: string, body: RescheduleDeliveryDto) {
    const delivery = await this.deliveryRepository.findById(id);

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.customer.toString() !== user._id.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    if (!delivery.canReschedule) {
      throw new BadRequestException('This delivery cannot be rescheduled');
    }

    const newScheduledTime = new Date(body.newScheduledPickupTime);
    const newTimePricing = await this.deliveryRepository.findTimePricing(newScheduledTime);

    const currentPrice = delivery.pricing.totalPrice;
    let newPrice = currentPrice;

    if (newTimePricing) {
      const baseWithoutTime = currentPrice / (delivery.pricing.timeMultiplier || 1);
      newPrice = Math.round(baseWithoutTime * newTimePricing.priceMultiplier);
    }

    const priceDifference = newPrice - currentPrice;

    return {
      success: true,
      message: 'Reschedule preview calculated',
      data: {
        currentPrice,
        newPrice,
        priceDifference,
        additionalPaymentRequired: priceDifference > 0,
        newScheduledTime: body.newScheduledPickupTime,
        currency: delivery.pricing.currency,
      },
    };
  }

  async confirmReschedulePayment(user: User, id: string, body: ConfirmReschedulePaymentDto) {
    const delivery = await this.deliveryRepository.findById(id);

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.customer.toString() !== user._id.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    // This would be called after additional payment is confirmed
    // For now, we'll assume payment was verified externally

    return {
      success: true,
      message: 'Delivery rescheduled successfully with additional payment',
      data: {
        newScheduledTime: delivery.scheduledPickupTime,
      },
    };
  }

  // ============ Rider Information ============

  async getRiderInfo(user: User, id: string) {
    const delivery = await this.deliveryRepository.findById(id);

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.customer.toString() !== user._id.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    if (!delivery.rider) {
      throw new BadRequestException('No rider assigned to this delivery');
    }

    const rider = await this.deliveryRepository.findRiderPublicInfo(
      delivery.rider as unknown as Types.ObjectId,
    );

    if (!rider) {
      throw new NotFoundException('Rider information not found');
    }

    // Calculate ETA if rider has location
    let estimatedArrival = null;
    if (rider.currentLatitude && rider.currentLongitude) {
      const targetLocation =
        delivery.status === DeliveryStatusEnum.IN_TRANSIT
          ? delivery.dropoffLocation
          : delivery.pickupLocation;

      const distance = this.deliveryRepository.calculateDistance(
        parseFloat(rider.currentLatitude),
        parseFloat(rider.currentLongitude),
        parseFloat(targetLocation.latitude),
        parseFloat(targetLocation.longitude),
      );
      estimatedArrival = `${Math.ceil(distance * 2)} mins away`;
    }

    return {
      success: true,
      message: 'Rider info retrieved',
      data: {
        riderId: delivery.rider,
        firstName: rider.firstName,
        lastName: rider.lastName,
        profilePhoto: rider.profilePhoto,
        vehicleType: rider.vehicleType,
        vehiclePlateNumber: rider.vehiclePlateNumber,
        currentLocation: {
          latitude: rider.currentLatitude,
          longitude: rider.currentLongitude,
        },
        estimatedArrival,
        averageRating: rider.averageRating,
        // NOTE: phone/contact NOT included per policy
      },
    };
  }

  // ============ Rescheduling Rules ============

  async canReschedule(user: User, id: string) {
    const delivery = await this.deliveryRepository.findById(id);

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.customer.toString() !== user._id.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    // Rescheduling rules based on status
    const nonReschedulableStatuses = [
      DeliveryStatusEnum.RIDER_ARRIVED_PICKUP,
      DeliveryStatusEnum.AWAITING_PAYMENT,
      DeliveryStatusEnum.PAYMENT_CONFIRMED,
      DeliveryStatusEnum.PICKUP_IN_PROGRESS,
      DeliveryStatusEnum.PICKED_UP,
      DeliveryStatusEnum.IN_TRANSIT,
      DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF,
      DeliveryStatusEnum.DELIVERY_IN_PROGRESS,
      DeliveryStatusEnum.DELIVERED,
      DeliveryStatusEnum.COMPLETED,
      DeliveryStatusEnum.CANCELLED,
    ];

    const canReschedule = !nonReschedulableStatuses.includes(
      delivery.status as DeliveryStatusEnum,
    );

    let reason = null;
    if (!canReschedule) {
      if (delivery.status === DeliveryStatusEnum.RIDER_ARRIVED_PICKUP) {
        reason = 'Rider has arrived at pickup location';
      } else if (
        [
          DeliveryStatusEnum.PICKED_UP,
          DeliveryStatusEnum.IN_TRANSIT,
        ].includes(delivery.status as DeliveryStatusEnum)
      ) {
        reason = 'Parcel is already in transit';
      } else if (delivery.status === DeliveryStatusEnum.DELIVERED) {
        reason = 'Delivery has been completed';
      } else if (delivery.status === DeliveryStatusEnum.CANCELLED) {
        reason = 'Delivery has been cancelled';
      } else {
        reason = 'Delivery cannot be rescheduled at this stage';
      }
    }

    return {
      success: true,
      message: 'Reschedule status retrieved',
      data: {
        canReschedule,
        reason,
        currentStatus: delivery.status,
      },
    };
  }

  // ============ Coupon Validation ============

  async validateCoupon(user: User, code: string) {
    const coupon = await this.deliveryRepository.findCouponByCode(code);

    if (!coupon) {
      throw new NotFoundException('Coupon not found or expired');
    }

    // Check usage limits
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    // Check per-user limit
    const userId = new Types.ObjectId(user._id);
    if (coupon.usedBy && coupon.usedBy.some(id => id.toString() === userId.toString())) {
      const userUsageCount = coupon.usedBy.filter(id => id.toString() === userId.toString()).length;
      if (userUsageCount >= coupon.usageLimitPerUser) {
        throw new BadRequestException('You have already used this coupon the maximum number of times');
      }
    }

    // Check first order only
    if (coupon.isFirstOrderOnly) {
      const { total } = await this.deliveryRepository.findByCustomer(userId, { limit: 1 });
      if (total > 0) {
        throw new BadRequestException('This coupon is only valid for first-time orders');
      }
    }

    // Check applicable users
    if (coupon.applicableUsers && coupon.applicableUsers.length > 0) {
      const isApplicable = coupon.applicableUsers.some(id => id.toString() === userId.toString());
      if (!isApplicable) {
        throw new BadRequestException('This coupon is not applicable to your account');
      }
    }

    return {
      success: true,
      message: 'Coupon is valid',
      data: {
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        maxDiscountAmount: coupon.maxDiscountAmount,
        minOrderAmount: coupon.minOrderAmount,
        validUntil: coupon.validUntil,
      },
    };
  }

  // ============ Active Delivery ============

  async getActiveDelivery(user: User) {
    const activeStatuses = [
      DeliveryStatusEnum.SEARCHING_RIDER,
      DeliveryStatusEnum.RIDER_ACCEPTED,
      DeliveryStatusEnum.RIDER_ASSIGNED,
      DeliveryStatusEnum.RIDER_EN_ROUTE_PICKUP,
      DeliveryStatusEnum.RIDER_ARRIVED_PICKUP,
      DeliveryStatusEnum.AWAITING_PAYMENT,
      DeliveryStatusEnum.PAYMENT_CONFIRMED,
      DeliveryStatusEnum.PICKUP_IN_PROGRESS,
      DeliveryStatusEnum.PICKED_UP,
      DeliveryStatusEnum.IN_TRANSIT,
      DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF,
      DeliveryStatusEnum.DELIVERY_IN_PROGRESS,
    ];

    const delivery = await this.deliveryRepository.deliveryModel
      .findOne({
        customer: user._id,
        status: { $in: activeStatuses },
      })
      .sort({ createdAt: -1 })
      .populate('rider', 'firstName lastName profilePhoto vehicleType vehiclePlateNumber averageRating currentLatitude currentLongitude')
      .lean();

    if (!delivery) {
      return {
        success: true,
        message: 'No active delivery',
        data: { hasActiveDelivery: false, delivery: null },
      };
    }

    return {
      success: true,
      message: 'Active delivery found',
      data: {
        hasActiveDelivery: true,
        delivery: {
          id: delivery._id,
          trackingNumber: delivery.trackingNumber,
          status: delivery.status,
          deliveryType: delivery.deliveryType,
          pickupLocation: delivery.pickupLocation,
          dropoffLocation: delivery.dropoffLocation,
          pricing: {
            totalPrice: delivery.pricing.totalPrice,
            currency: delivery.pricing.currency,
          },
          paymentStatus: delivery.paymentStatus,
          rider: delivery.rider,
          scheduledPickupTime: delivery.scheduledPickupTime,
          createdAt: delivery.createdAt,
        },
      },
    };
  }

  // ============ Private Helper Methods ============

  private async calculatePricing(body: CreateDeliveryRequestDto) {
    // Get active pricing config
    const config = await this.deliveryRepository.getActivePricingConfig();
    if (!config) {
      throw new BadRequestException('Pricing configuration not available');
    }

    // Calculate distance
    const distance = this.deliveryRepository.calculateDistance(
      parseFloat(body.pickupLocation.latitude),
      parseFloat(body.pickupLocation.longitude),
      parseFloat(body.dropoffLocation.latitude),
      parseFloat(body.dropoffLocation.longitude),
    );

    // Estimate duration
    const duration = this.deliveryRepository.estimateDuration(distance);

    // Get zones
    const pickupZone = await this.deliveryRepository.findZoneByCoordinates(
      parseFloat(body.pickupLocation.latitude),
      parseFloat(body.pickupLocation.longitude),
    );

    const dropoffZone = await this.deliveryRepository.findZoneByCoordinates(
      parseFloat(body.dropoffLocation.latitude),
      parseFloat(body.dropoffLocation.longitude),
    );

    const isInterZone =
      pickupZone && dropoffZone && pickupZone._id.toString() !== dropoffZone._id.toString();

    // Get weight pricing
    const weightPricing = await this.deliveryRepository.findWeightPricing(
      body.parcelDetails.weight,
    );

    // Get time pricing
    const scheduledTime = body.scheduledPickupTime
      ? new Date(body.scheduledPickupTime)
      : new Date();
    const timePricing = await this.deliveryRepository.findTimePricing(scheduledTime);

    // Calculate multipliers
    const zoneMultiplier = pickupZone?.priceMultiplier || 1.0;
    const weightMultiplier = weightPricing?.priceMultiplier || 1.0;
    const timeMultiplier = timePricing?.priceMultiplier || 1.0;
    const deliveryTypeMultiplier =
      body.deliveryType === DeliveryTypeEnum.QUICK
        ? config.quickDeliveryMultiplier || 1.0
        : config.scheduledDeliveryMultiplier || 1.0;
    const interZoneMultiplier = isInterZone ? config.interZoneMultiplier || 1.0 : 1.0;

    // Calculate base prices
    const basePrice = config.baseDeliveryFee;
    const distancePrice = Math.round(distance * config.pricePerKm);
    const weightPrice = weightPricing?.additionalFee || 0;
    const timePrice = timePricing?.additionalFee || 0;

    // Calculate subtotal with multipliers
    let subtotal = basePrice + distancePrice + weightPrice + timePrice;
    subtotal = Math.round(
      subtotal *
        zoneMultiplier *
        weightMultiplier *
        timeMultiplier *
        deliveryTypeMultiplier *
        interZoneMultiplier,
    );

    // Apply minimum
    subtotal = Math.max(subtotal, config.minimumDeliveryFee);

    // Apply maximum if set
    if (config.maximumDeliveryFee) {
      subtotal = Math.min(subtotal, config.maximumDeliveryFee);
    }

    // Calculate service fee
    let serviceFee = Math.round(subtotal * (config.serviceFeePercentage || 0));
    serviceFee = Math.max(serviceFee, config.minimumServiceFee || 0);
    if (config.maximumServiceFee) {
      serviceFee = Math.min(serviceFee, config.maximumServiceFee);
    }

    // Apply coupon if provided
    let discountAmount = 0;
    let coupon = null;

    if (body.couponCode) {
      coupon = await this.deliveryRepository.findCouponByCode(body.couponCode);
      if (coupon) {
        if (coupon.discountType === 'percentage') {
          discountAmount = Math.round(subtotal * (coupon.discountValue / 100));
          if (coupon.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
          }
        } else {
          discountAmount = coupon.discountValue;
        }
        discountAmount = Math.min(discountAmount, subtotal); // Can't discount more than subtotal
      }
    }

    const totalPrice = subtotal + serviceFee - discountAmount;

    return {
      estimatedDistance: Math.round(distance * 100) / 100,
      estimatedDuration: duration,
      pickupZone,
      dropoffZone,
      isInterZone,
      weightPricing,
      timePricing,
      coupon,
      breakdown: {
        basePrice,
        distancePrice,
        weightPrice,
        timeMultiplierPrice: Math.round(subtotal * (timeMultiplier - 1)),
        zoneMultiplierPrice: Math.round(subtotal * (zoneMultiplier - 1)),
        surgePrice: 0,
        serviceFee,
        discountAmount,
        couponApplied: coupon?._id,
        couponCode: coupon?.code,
        subtotal,
        totalPrice,
        currency: config.currency,
        zoneMultiplier,
        weightMultiplier,
        timeMultiplier,
        deliveryTypeMultiplier,
      },
    };
  }
}
