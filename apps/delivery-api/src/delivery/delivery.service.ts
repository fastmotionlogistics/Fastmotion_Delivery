import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DeliveryRequest, DeliveryRequestDocument, Rider, RiderDocument, User, UserDocument, PricingConfig, PricingConfigDocument } from '@libs/database';
import { DeliveryStatusEnum, DeliveryTypeEnum, DeliveryPaymentStatusEnum, RiderStatusEnum } from '@libs/common';
import { DeliveryGateway } from '@libs/common/modules/gateway';
import { NotificationService } from '@libs/common/modules/notification';
import { NotificationRecipientType } from '@libs/database';
import {
  AcceptDeliveryDto,
  RejectDeliveryDto,
  UpdateDeliveryStatusDto,
  VerifyPickupPinDto,
  VerifyDeliveryPinDto,
  UpdateRiderLocationDto,
} from './dto';
import { EarningsService } from '../earnings/earnings.service';

// ── Valid status transitions ──────────────────────────────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  [DeliveryStatusEnum.RIDER_ACCEPTED]: [DeliveryStatusEnum.RIDER_EN_ROUTE_PICKUP],
  [DeliveryStatusEnum.RIDER_ASSIGNED]: [DeliveryStatusEnum.RIDER_EN_ROUTE_PICKUP],
  [DeliveryStatusEnum.RIDER_EN_ROUTE_PICKUP]: [DeliveryStatusEnum.RIDER_ARRIVED_PICKUP],
  [DeliveryStatusEnum.RIDER_ARRIVED_PICKUP]: [
    DeliveryStatusEnum.AWAITING_PAYMENT,
    DeliveryStatusEnum.PICKUP_IN_PROGRESS,
  ],
  [DeliveryStatusEnum.PAYMENT_CONFIRMED]: [DeliveryStatusEnum.PICKUP_IN_PROGRESS],
  [DeliveryStatusEnum.PICKUP_IN_PROGRESS]: [DeliveryStatusEnum.PICKED_UP],
  [DeliveryStatusEnum.PICKED_UP]: [DeliveryStatusEnum.IN_TRANSIT],
  [DeliveryStatusEnum.IN_TRANSIT]: [DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF],
  [DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF]: [DeliveryStatusEnum.DELIVERY_IN_PROGRESS],
  [DeliveryStatusEnum.DELIVERY_IN_PROGRESS]: [DeliveryStatusEnum.DELIVERED],
  [DeliveryStatusEnum.DELIVERED]: [DeliveryStatusEnum.COMPLETED],
};

// Human-readable status labels for system chat messages
const STATUS_LABELS: Record<string, string> = {
  [DeliveryStatusEnum.RIDER_ACCEPTED]: 'Rider has accepted the delivery',
  [DeliveryStatusEnum.RIDER_EN_ROUTE_PICKUP]: 'Rider is on the way to pickup location',
  [DeliveryStatusEnum.RIDER_ARRIVED_PICKUP]: 'Rider has arrived at pickup location',
  [DeliveryStatusEnum.AWAITING_PAYMENT]: 'Waiting for customer payment',
  [DeliveryStatusEnum.PAYMENT_CONFIRMED]: 'Payment confirmed',
  [DeliveryStatusEnum.PICKUP_IN_PROGRESS]: 'Pickup is in progress',
  [DeliveryStatusEnum.PICKED_UP]: 'Parcel has been picked up',
  [DeliveryStatusEnum.IN_TRANSIT]: 'Parcel is in transit to drop-off location',
  [DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF]: 'Rider has arrived at drop-off location',
  [DeliveryStatusEnum.DELIVERY_IN_PROGRESS]: 'Delivery is in progress',
  [DeliveryStatusEnum.DELIVERED]: 'Parcel has been delivered',
  [DeliveryStatusEnum.COMPLETED]: 'Delivery completed',
  [DeliveryStatusEnum.CANCELLED]: 'Delivery has been cancelled',
};

@Injectable()
export class DeliveryService {
  constructor(
    @InjectModel(DeliveryRequest.name)
    private readonly deliveryModel: Model<DeliveryRequestDocument>,
    @InjectModel(Rider.name)
    private readonly riderModel: Model<RiderDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(PricingConfig.name)
    private readonly pricingModel: Model<PricingConfigDocument>,
    private readonly gateway: DeliveryGateway,
    private readonly notificationService: NotificationService,
    private readonly earningsService: EarningsService,
  ) {}

  // Cached commission config
  private _commissionCache: { rate: number; min: number; ts: number } | null = null;

  private async getCommissionConfig(): Promise<{ rate: number; min: number }> {
    // Cache for 5 minutes to avoid repeated DB lookups
    if (this._commissionCache && Date.now() - this._commissionCache.ts < 5 * 60 * 1000) {
      return { rate: this._commissionCache.rate, min: this._commissionCache.min };
    }
    const config = await this.pricingModel.findOne({ isActive: true }).select('riderCommissionPercentage minimumRiderPayout').lean();
    const rate = config?.riderCommissionPercentage ?? 0.80;
    const min = config?.minimumRiderPayout ?? 100;
    this._commissionCache = { rate, min, ts: Date.now() };
    return { rate, min };
  }

  /** Calculate what the rider earns for a given total price */
  private computeRiderPayout(totalPrice: number, rate: number, min: number): number {
    return Math.max(Math.round(totalPrice * rate), min);
  }

  // Helper: push notify customer (persists to DB + Firebase push)
  private async pushNotifyCustomer(customerId: any, title: string, body: string, data?: Record<string, any>) {
    try {
      const user = await this.userModel.findById(customerId).select('deviceToken fcmToken').lean();
      const token = (user as any)?.deviceToken || (user as any)?.fcmToken || undefined;
      await this.notificationService.send({
        recipientId: customerId,
        recipientType: NotificationRecipientType.USER,
        title,
        body,
        token,
        data,
      });
    } catch (_) {}
  }

  // ═══════════════════════════════════════════════
  //  AVAILABLE DELIVERIES
  // ═══════════════════════════════════════════════

  async getAvailableDeliveries(rider: Rider, filters: { latitude?: string; longitude?: string; radius?: number }) {
    // Rider must be verified and online
    if (rider.verificationStatus !== 'verified') {
      throw new ForbiddenException('Account must be verified to view deliveries');
    }
    if (!rider.isOnline) {
      throw new BadRequestException('You must be online to view available deliveries');
    }

    // Find deliveries that are searching for a rider
    const query: any = {
      status: { $in: [DeliveryStatusEnum.SEARCHING_RIDER, DeliveryStatusEnum.PENDING] },
      rider: { $exists: false },
    };

    const deliveries = await this.deliveryModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .select(
        'trackingNumber deliveryType pickupLocation dropoffLocation parcelDetails estimatedDistance estimatedDuration pricing.totalPrice pricing.currency createdAt',
      )
      .lean();

    // If rider location is provided, sort by distance to pickup
    let results = deliveries;
    if (filters.latitude && filters.longitude) {
      const riderLat = parseFloat(filters.latitude);
      const riderLng = parseFloat(filters.longitude);
      const radiusKm = filters.radius || 15;

      results = deliveries
        .map((d) => {
          const dist = this.calculateDistance(
            riderLat,
            riderLng,
            parseFloat(d.pickupLocation.latitude),
            parseFloat(d.pickupLocation.longitude),
          );
          return { ...d, distanceFromRider: Math.round(dist * 100) / 100 };
        })
        .filter((d) => (d as any).distanceFromRider <= radiusKm)
        .sort((a, b) => (a as any).distanceFromRider - (b as any).distanceFromRider);
    }

    // Attach riderPayout to each delivery
    const { rate, min } = await this.getCommissionConfig();
    const withPayout = results.map(d => ({
      ...d,
      riderPayout: this.computeRiderPayout(d.pricing?.totalPrice || 0, rate, min),
    }));

    return {
      success: true,
      message: 'Available deliveries retrieved',
      data: withPayout,
    };
  }

  // ═══════════════════════════════════════════════
  //  ACTIVE DELIVERIES
  // ═══════════════════════════════════════════════

  async getActiveDeliveries(rider: Rider) {
    const activeStatuses = [
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

    const deliveries = await this.deliveryModel
      .find({ rider: rider._id, status: { $in: activeStatuses } })
      .sort({ createdAt: -1 })
      .populate('customer', 'firstName lastName phone')
      .lean();

    // Attach riderPayout
    const { rate, min } = await this.getCommissionConfig();
    const withPayout = deliveries.map(d => ({
      ...d,
      riderPayout: this.computeRiderPayout(d.pricing?.totalPrice || 0, rate, min),
    }));

    return {
      success: true,
      message: 'Active deliveries retrieved',
      data: withPayout,
    };
  }

  // ═══════════════════════════════════════════════
  //  DELIVERY HISTORY
  // ═══════════════════════════════════════════════

  async getDeliveryHistory(rider: Rider, filters: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = filters;

    const query = {
      rider: rider._id,
      status: {
        $in: [DeliveryStatusEnum.DELIVERED, DeliveryStatusEnum.COMPLETED, DeliveryStatusEnum.CANCELLED],
      },
    };

    const [data, total] = await Promise.all([
      this.deliveryModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('customer', 'firstName lastName')
        .lean(),
      this.deliveryModel.countDocuments(query),
    ]);

    // Attach riderPayout
    const { rate, min } = await this.getCommissionConfig();
    const withPayout = data.map(d => ({
      ...d,
      riderPayout: this.computeRiderPayout(d.pricing?.totalPrice || 0, rate, min),
    }));

    return {
      success: true,
      message: 'Delivery history retrieved',
      data: withPayout,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  GET DELIVERY BY ID
  // ═══════════════════════════════════════════════

  async getDeliveryById(rider: Rider, id: string) {
    const delivery = await this.deliveryModel
      .findById(id)
      .populate('customer', 'firstName lastName phone profilePhotoUrl')
      .populate('rating')
      .lean();

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    // Rider can only view if they are assigned or it's still available
    const isAssigned = delivery.rider?.toString() === rider._id.toString();
    const isAvailable = [DeliveryStatusEnum.SEARCHING_RIDER, DeliveryStatusEnum.PENDING].includes(
      delivery.status as DeliveryStatusEnum,
    );

    if (!isAssigned && !isAvailable) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    // Attach riderPayout
    const { rate, min } = await this.getCommissionConfig();
    const riderPayout = this.computeRiderPayout(delivery.pricing?.totalPrice || 0, rate, min);

    return {
      success: true,
      message: 'Delivery retrieved',
      data: { ...delivery, riderPayout },
    };
  }

  // ═══════════════════════════════════════════════
  //  ACCEPT DELIVERY
  // ═══════════════════════════════════════════════

  async acceptDelivery(rider: Rider, body: AcceptDeliveryDto) {
    if (rider.verificationStatus !== 'verified') {
      throw new ForbiddenException('Account must be verified to accept deliveries');
    }
    if (!rider.isOnline) {
      throw new BadRequestException('You must be online to accept deliveries');
    }
    if (rider.currentDeliveryCount >= rider.maxConcurrentDeliveries) {
      throw new BadRequestException(
        `You already have ${rider.currentDeliveryCount} active delivery(s). Max allowed: ${rider.maxConcurrentDeliveries}`,
      );
    }

    const delivery = await this.deliveryModel.findById(body.deliveryRequestId);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    // Only accept deliveries that are searching for riders
    if (delivery.status !== DeliveryStatusEnum.SEARCHING_RIDER && delivery.status !== DeliveryStatusEnum.PENDING) {
      throw new BadRequestException('This delivery is no longer available');
    }

    // Check if already assigned to another rider
    if (delivery.rider) {
      throw new BadRequestException('This delivery has already been assigned to another rider');
    }

    // Assign rider and update status
    delivery.rider = rider._id as any;
    delivery.status = DeliveryStatusEnum.RIDER_ACCEPTED;
    delivery.riderAcceptedAt = new Date();
    delivery.canReschedule = false; // Lock rescheduling once rider accepts
    await delivery.save();

    // Update rider stats
    await this.riderModel.updateOne(
      { _id: rider._id },
      {
        $inc: { currentDeliveryCount: 1 },
        $set: { status: RiderStatusEnum.ON_DELIVERY },
      },
    );

    // WS: notify customer that rider accepted
    const deliveryId = delivery._id.toString();
    this.gateway.emitDeliveryStatusUpdate(deliveryId, DeliveryStatusEnum.RIDER_ACCEPTED, {
      riderId: rider._id,
      riderName: `${rider.firstName} ${rider.lastName}`,
      riderRating: rider.averageRating,
      vehicleType: rider.vehicleType,
      vehiclePlateNumber: rider.vehiclePlateNumber,
      paymentStatus: delivery.paymentStatus,
    });
    this.gateway.emitSystemChatMessage(
      deliveryId,
      `${rider.firstName} has accepted your delivery and is heading to pickup.`,
    );

    // WS: push rider location if available
    if (rider.currentLatitude && rider.currentLongitude) {
      this.gateway.emitRiderLocation(deliveryId, {
        latitude: parseFloat(rider.currentLatitude),
        longitude: parseFloat(rider.currentLongitude),
      });
    }

    // Push notification to customer
    await this.pushNotifyCustomer(
      delivery.customer,
      'Rider Accepted! 🏍️',
      `${rider.firstName} has accepted your delivery and is heading to the pickup location.`,
      { type: 'rider_accepted', deliveryId: deliveryId, trackingNumber: delivery.trackingNumber },
    );

    // Compute rider payout
    const { rate, min } = await this.getCommissionConfig();
    const riderPayout = this.computeRiderPayout(delivery.pricing.totalPrice, rate, min);

    return {
      success: true,
      message: 'Delivery accepted successfully',
      data: {
        deliveryId: delivery._id,
        trackingNumber: delivery.trackingNumber,
        status: delivery.status,
        pickupLocation: delivery.pickupLocation,
        dropoffLocation: delivery.dropoffLocation,
        parcelDetails: delivery.parcelDetails,
        estimatedDistance: delivery.estimatedDistance,
        estimatedDuration: delivery.estimatedDuration,
        pricing: {
          totalPrice: delivery.pricing.totalPrice,
          currency: delivery.pricing.currency,
        },
        riderPayout,
        customer: await this.userModel.findById(delivery.customer).select('firstName lastName phone').lean(),
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  REJECT DELIVERY
  // ═══════════════════════════════════════════════

  async rejectDelivery(rider: Rider, body: RejectDeliveryDto) {
    const delivery = await this.deliveryModel.findById(body.deliveryRequestId);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    // If delivery was already assigned to this rider, unassign
    if (delivery.rider?.toString() === rider._id.toString()) {
      delivery.rider = undefined;
      delivery.status = DeliveryStatusEnum.SEARCHING_RIDER;
      delivery.riderAcceptedAt = undefined;
      delivery.canReschedule = true;
      await delivery.save();

      // Decrease rider count
      await this.riderModel.updateOne({ _id: rider._id }, { $inc: { currentDeliveryCount: -1 } });

      // WS: notify customer that rider is no longer assigned
      this.gateway.emitDeliveryStatusUpdate(delivery._id.toString(), DeliveryStatusEnum.SEARCHING_RIDER);
      this.gateway.emitSystemChatMessage(
        delivery._id.toString(),
        'Rider is no longer available. Searching for a new rider...',
      );
    }

    return {
      success: true,
      message: 'Delivery rejected',
      data: { deliveryId: delivery._id },
    };
  }

  // ═══════════════════════════════════════════════
  //  UPDATE DELIVERY STATUS
  // ═══════════════════════════════════════════════

  async updateDeliveryStatus(rider: Rider, id: string, body: UpdateDeliveryStatusDto) {
    const delivery = await this.deliveryModel.findById(id);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }
    if (delivery.rider?.toString() !== rider._id.toString()) {
      throw new ForbiddenException('You are not assigned to this delivery');
    }

    const currentStatus = delivery.status as string;
    const newStatus = body.status;

    // Validate transition
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    // Build update fields based on new status
    const updateFields: Record<string, any> = { status: newStatus };

    switch (newStatus) {
      case DeliveryStatusEnum.RIDER_EN_ROUTE_PICKUP:
        break;
      case DeliveryStatusEnum.RIDER_ARRIVED_PICKUP:
        updateFields.arrivedAtPickupAt = new Date();
        updateFields.canReschedule = false;
        break;
      case DeliveryStatusEnum.PICKUP_IN_PROGRESS:
        break;
      case DeliveryStatusEnum.PICKED_UP:
        updateFields.pickedUpAt = new Date();
        break;
      case DeliveryStatusEnum.IN_TRANSIT:
        break;
      case DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF:
        updateFields.arrivedAtDropoffAt = new Date();
        break;
      case DeliveryStatusEnum.DELIVERY_IN_PROGRESS:
        break;
      case DeliveryStatusEnum.DELIVERED:
        updateFields.deliveredAt = new Date();
        break;
      case DeliveryStatusEnum.COMPLETED:
        updateFields.completedAt = new Date();
        break;
    }

    await this.deliveryModel.updateOne({ _id: id }, { $set: updateFields });

    // WS: broadcast status change to customer
    const deliveryId = delivery._id.toString();
    this.gateway.emitDeliveryStatusUpdate(deliveryId, newStatus);

    // WS: system chat message
    const label = STATUS_LABELS[newStatus];
    if (label) {
      this.gateway.emitSystemChatMessage(deliveryId, label);
    }

    // If rider arrived at pickup and it's a quick delivery needing payment, notify customer
    if (
      newStatus === DeliveryStatusEnum.RIDER_ARRIVED_PICKUP &&
      delivery.deliveryType === DeliveryTypeEnum.QUICK &&
      delivery.paymentStatus !== DeliveryPaymentStatusEnum.PAID
    ) {
      this.gateway.emitDeliveryStatusUpdate(deliveryId, DeliveryStatusEnum.RIDER_ARRIVED_PICKUP, {
        paymentRequired: true,
      });
    }

    // ── Push notifications to customer for key status changes ──
    const riderName = rider.firstName || 'Your rider';
    const tn = delivery.trackingNumber;
    const notifData = { type: `status_${newStatus}`, deliveryId, trackingNumber: tn };

    const CUSTOMER_NOTIF_MAP: Record<string, { title: string; body: string } | null> = {
      [DeliveryStatusEnum.RIDER_EN_ROUTE_PICKUP]: {
        title: 'Rider On The Way 🏍️',
        body: `${riderName} is heading to the pickup location for ${tn}.`,
      },
      [DeliveryStatusEnum.PICKUP_IN_PROGRESS]: {
        title: 'Pickup Started 📦',
        body: `${riderName} is picking up your parcel (${tn}).`,
      },
      [DeliveryStatusEnum.PICKED_UP]: {
        title: 'Parcel Picked Up ✅',
        body: `Your parcel (${tn}) has been picked up and is being prepared for transit.`,
      },
      [DeliveryStatusEnum.IN_TRANSIT]: {
        title: 'Package In Transit 🚀',
        body: `Your parcel (${tn}) is on its way to the drop-off location.`,
      },
      [DeliveryStatusEnum.DELIVERY_IN_PROGRESS]: {
        title: 'Almost There! 📍',
        body: `${riderName} is delivering your parcel (${tn}). Please be ready with the delivery PIN.`,
      },
    };

    const notif = CUSTOMER_NOTIF_MAP[newStatus];
    if (notif) {
      this.pushNotifyCustomer(delivery.customer, notif.title, notif.body, notifData).catch(() => {});
    }

    // On delivered/completed, update rider stats
    if (newStatus === DeliveryStatusEnum.DELIVERED || newStatus === DeliveryStatusEnum.COMPLETED) {
      await this.riderModel.updateOne(
        { _id: rider._id },
        {
          $inc: {
            currentDeliveryCount: -1,
            totalDeliveries: 1,
          },
        },
      );

      // Set rider back to available if no more active deliveries
      const activeCount = await this.deliveryModel.countDocuments({
        rider: rider._id,
        status: {
          $in: [
            DeliveryStatusEnum.RIDER_ACCEPTED,
            DeliveryStatusEnum.RIDER_EN_ROUTE_PICKUP,
            DeliveryStatusEnum.RIDER_ARRIVED_PICKUP,
            DeliveryStatusEnum.AWAITING_PAYMENT,
            DeliveryStatusEnum.PAYMENT_CONFIRMED,
            DeliveryStatusEnum.PICKUP_IN_PROGRESS,
            DeliveryStatusEnum.PICKED_UP,
            DeliveryStatusEnum.IN_TRANSIT,
            DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF,
            DeliveryStatusEnum.DELIVERY_IN_PROGRESS,
          ],
        },
      });

      if (activeCount <= 1) {
        // <= 1 because this delivery is still counted
        await this.riderModel.updateOne({ _id: rider._id }, { $set: { status: RiderStatusEnum.AVAILABLE } });
      }
    }

    return {
      success: true,
      message: `Delivery status updated to ${newStatus}`,
      data: {
        deliveryId: id,
        previousStatus: currentStatus,
        currentStatus: newStatus,
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  VERIFY PICKUP PIN
  // ═══════════════════════════════════════════════

  async verifyPickupPin(rider: Rider, id: string, body: VerifyPickupPinDto) {
    const delivery = await this.deliveryModel.findById(id).select('+pickupPin').lean();

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }
    if (delivery.rider?.toString() !== rider._id.toString()) {
      throw new ForbiddenException('You are not assigned to this delivery');
    }

    // Must be at pickup and payment confirmed
    const validStatuses = [
      DeliveryStatusEnum.RIDER_ARRIVED_PICKUP,
      DeliveryStatusEnum.PAYMENT_CONFIRMED,
      DeliveryStatusEnum.PICKUP_IN_PROGRESS,
    ];

    if (!validStatuses.includes(delivery.status as DeliveryStatusEnum)) {
      throw new BadRequestException('Pickup PIN verification is not available at this stage');
    }

    if (!delivery.pickupPin) {
      throw new BadRequestException('No pickup PIN has been generated for this delivery');
    }

    if (body.pin !== delivery.pickupPin) {
      throw new BadRequestException('Invalid pickup PIN');
    }

    // PIN verified — update status
    await this.deliveryModel.updateOne(
      { _id: id },
      {
        $set: {
          pickupPinVerified: true,
          status: DeliveryStatusEnum.PICKUP_IN_PROGRESS,
        },
      },
    );

    const deliveryId = delivery._id.toString();
    this.gateway.emitDeliveryStatusUpdate(deliveryId, DeliveryStatusEnum.PICKUP_IN_PROGRESS);
    this.gateway.emitSystemChatMessage(deliveryId, 'Pickup PIN verified. Pickup is in progress.');

    return {
      success: true,
      message: 'Pickup PIN verified successfully',
      data: {
        deliveryId: id,
        status: DeliveryStatusEnum.PICKUP_IN_PROGRESS,
        pickupPinVerified: true,
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  VERIFY DELIVERY PIN (completes delivery)
  // ═══════════════════════════════════════════════

  async verifyDeliveryPin(rider: Rider, id: string, body: VerifyDeliveryPinDto) {
    const delivery = await this.deliveryModel.findById(id).select('+deliveryPin').lean();

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }
    if (delivery.rider?.toString() !== rider._id.toString()) {
      throw new ForbiddenException('You are not assigned to this delivery');
    }

    const validStatuses = [
      DeliveryStatusEnum.IN_TRANSIT,
      DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF,
      DeliveryStatusEnum.DELIVERY_IN_PROGRESS,
    ];

    if (!validStatuses.includes(delivery.status as DeliveryStatusEnum)) {
      throw new BadRequestException('Delivery PIN verification is not available at this stage');
    }

    if (!delivery.deliveryPin) {
      throw new BadRequestException('No delivery PIN has been generated for this delivery');
    }

    if (body.pin !== delivery.deliveryPin) {
      throw new BadRequestException('Invalid delivery PIN');
    }

    // PIN verified — mark as delivered
    const now = new Date();
    await this.deliveryModel.updateOne(
      { _id: id },
      {
        $set: {
          deliveryPinVerified: true,
          status: DeliveryStatusEnum.DELIVERED,
          deliveredAt: now,
          completedAt: now,
        },
      },
    );

    // Update rider stats
    await this.riderModel.updateOne(
      { _id: rider._id },
      {
        $inc: { currentDeliveryCount: -1, totalDeliveries: 1 },
      },
    );

    // Set rider to available if no more active
    const activeCount = await this.deliveryModel.countDocuments({
      rider: rider._id,
      _id: { $ne: delivery._id },
      status: {
        $nin: [
          DeliveryStatusEnum.DELIVERED,
          DeliveryStatusEnum.COMPLETED,
          DeliveryStatusEnum.CANCELLED,
          DeliveryStatusEnum.FAILED,
        ],
      },
    });

    if (activeCount === 0) {
      await this.riderModel.updateOne({ _id: rider._id }, { $set: { status: RiderStatusEnum.AVAILABLE } });
    }

    // Credit rider earnings (commission applied)
    try {
      await this.earningsService.creditDeliveryEarnings(
        new Types.ObjectId(rider._id as any),
        delivery._id as Types.ObjectId,
      );
    } catch (e) {
      // Log but don't fail the delivery completion
      console.error('Failed to credit earnings:', e?.message);
    }

    const deliveryId = delivery._id.toString();
    this.gateway.emitDeliveryStatusUpdate(deliveryId, DeliveryStatusEnum.DELIVERED);
    this.gateway.emitSystemChatMessage(deliveryId, 'Delivery PIN verified. Parcel has been delivered successfully! 🎉');

    // Push notification to customer
    await this.pushNotifyCustomer(
      delivery.customer,
      'Delivery Complete! ✅',
      'Your parcel has been delivered successfully. Thank you for using FastMotion!',
      { type: 'delivery_completed', deliveryId: id },
    );

    return {
      success: true,
      message: 'Delivery PIN verified. Delivery completed.',
      data: {
        deliveryId: id,
        status: DeliveryStatusEnum.DELIVERED,
        deliveryPinVerified: true,
        deliveredAt: now,
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  UPDATE RIDER LOCATION (HTTP fallback)
  // ═══════════════════════════════════════════════

  async updateRiderLocation(rider: Rider, id: string, body: UpdateRiderLocationDto) {
    const delivery = await this.deliveryModel.findById(id).select('rider status').lean();
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }
    if (delivery.rider?.toString() !== rider._id.toString()) {
      throw new ForbiddenException('You are not assigned to this delivery');
    }

    // Persist location
    await this.riderModel.updateOne(
      { _id: rider._id },
      {
        $set: {
          currentLatitude: body.latitude,
          currentLongitude: body.longitude,
          lastLocationUpdate: new Date(),
        },
      },
    );

    // Also broadcast via WS
    this.gateway.emitRiderLocation(id, {
      latitude: parseFloat(body.latitude),
      longitude: parseFloat(body.longitude),
    });

    // Calculate ETA to target
    const targetLoc =
      delivery.status === DeliveryStatusEnum.IN_TRANSIT || delivery.status === DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF
        ? 'dropoff'
        : 'pickup';

    // We'd need the full delivery to get target coords — simple estimate:
    const fullDelivery = await this.deliveryModel.findById(id).lean();
    if (fullDelivery) {
      const target = targetLoc === 'dropoff' ? fullDelivery.dropoffLocation : fullDelivery.pickupLocation;

      const dist = this.calculateDistance(
        parseFloat(body.latitude),
        parseFloat(body.longitude),
        parseFloat(target.latitude),
        parseFloat(target.longitude),
      );
      const etaMinutes = Math.ceil(dist * 2); // ~30 km/h average
      this.gateway.emitETAUpdate(id, { minutes: etaMinutes, distance: Math.round(dist * 100) / 100 });
    }

    return {
      success: true,
      message: 'Location updated',
      data: {
        latitude: body.latitude,
        longitude: body.longitude,
        updatedAt: new Date(),
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  ARRIVED AT PICKUP
  // ═══════════════════════════════════════════════

  async arrivedAtPickup(rider: Rider, id: string) {
    const delivery = await this.deliveryModel.findById(id);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }
    if (delivery.rider?.toString() !== rider._id.toString()) {
      throw new ForbiddenException('You are not assigned to this delivery');
    }

    const validStatuses = [
      DeliveryStatusEnum.RIDER_ACCEPTED,
      DeliveryStatusEnum.RIDER_ASSIGNED,
      DeliveryStatusEnum.RIDER_EN_ROUTE_PICKUP,
    ];

    if (!validStatuses.includes(delivery.status as DeliveryStatusEnum)) {
      throw new BadRequestException(`Cannot mark arrived at pickup from status "${delivery.status}"`);
    }

    delivery.status = DeliveryStatusEnum.RIDER_ARRIVED_PICKUP as any;
    delivery.arrivedAtPickupAt = new Date();
    delivery.canReschedule = false;

    // For already-paid deliveries (e.g. scheduled), generate PINs now if not yet generated
    const alreadyPaid = delivery.paymentStatus === DeliveryPaymentStatusEnum.PAID;
    if (alreadyPaid && !delivery.pickupPin) {
      delivery.pickupPin = this.generatePin();
    }
    if (alreadyPaid && !delivery.deliveryPin) {
      delivery.deliveryPin = this.generatePin();
    }

    await delivery.save();

    const deliveryId = delivery._id.toString();
    const isQuickPayPending =
      delivery.deliveryType === DeliveryTypeEnum.QUICK && delivery.paymentStatus !== DeliveryPaymentStatusEnum.PAID;

    this.gateway.emitDeliveryStatusUpdate(deliveryId, DeliveryStatusEnum.RIDER_ARRIVED_PICKUP, {
      paymentRequired: isQuickPayPending,
      paymentStatus: delivery.paymentStatus,
    });
    this.gateway.emitSystemChatMessage(
      deliveryId,
      isQuickPayPending
        ? `${rider.firstName} has arrived at the pickup location. Please complete payment to proceed.`
        : `${rider.firstName} has arrived at the pickup location. Please share the pickup PIN.`,
    );

    // Push notification to customer
    await this.pushNotifyCustomer(
      delivery.customer,
      'Rider at Pickup 📍',
      isQuickPayPending
        ? `${rider.firstName} has arrived. Please complete payment to proceed.`
        : `${rider.firstName} has arrived at the pickup location. Share the pickup PIN.`,
      { type: 'rider_arrived_pickup', deliveryId: id, paymentRequired: isQuickPayPending },
    );

    return {
      success: true,
      message: 'Marked as arrived at pickup',
      data: {
        deliveryId: id,
        status: DeliveryStatusEnum.RIDER_ARRIVED_PICKUP,
        arrivedAt: delivery.arrivedAtPickupAt,
        paymentRequired: isQuickPayPending,
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  ARRIVED AT DROPOFF
  // ═══════════════════════════════════════════════

  async arrivedAtDropoff(rider: Rider, id: string) {
    const delivery = await this.deliveryModel.findById(id);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }
    if (delivery.rider?.toString() !== rider._id.toString()) {
      throw new ForbiddenException('You are not assigned to this delivery');
    }

    const validStatuses = [DeliveryStatusEnum.IN_TRANSIT, DeliveryStatusEnum.PICKED_UP];

    if (!validStatuses.includes(delivery.status as DeliveryStatusEnum)) {
      throw new BadRequestException(`Cannot mark arrived at dropoff from status "${delivery.status}"`);
    }

    delivery.status = DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF as any;
    delivery.arrivedAtDropoffAt = new Date();
    await delivery.save();

    const deliveryId = delivery._id.toString();
    this.gateway.emitDeliveryStatusUpdate(deliveryId, DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF);
    this.gateway.emitSystemChatMessage(
      deliveryId,
      `${rider.firstName} has arrived at the drop-off location. Please share the delivery PIN.`,
    );

    // Push notification to customer
    await this.pushNotifyCustomer(
      delivery.customer,
      'Rider at Drop-off 📦',
      `${rider.firstName} has arrived at the drop-off location. Share the delivery PIN to complete.`,
      { type: 'rider_arrived_dropoff', deliveryId: id },
    );

    return {
      success: true,
      message: 'Marked as arrived at dropoff',
      data: {
        deliveryId: id,
        status: DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF,
        arrivedAt: delivery.arrivedAtDropoffAt,
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  TOGGLE ONLINE STATUS
  // ═══════════════════════════════════════════════

  async toggleOnlineStatus(rider: Rider) {
    const newOnline = !rider.isOnline;
    const newStatus = newOnline ? RiderStatusEnum.AVAILABLE : RiderStatusEnum.OFFLINE;

    await this.riderModel.updateOne(
      { _id: rider._id },
      {
        $set: {
          isOnline: newOnline,
          status: rider.currentDeliveryCount > 0 ? RiderStatusEnum.ON_DELIVERY : newStatus,
        },
      },
    );

    return {
      success: true,
      message: `Status changed to ${newOnline ? 'online' : 'offline'}`,
      data: {
        isOnline: newOnline,
        status: rider.currentDeliveryCount > 0 ? RiderStatusEnum.ON_DELIVERY : newStatus,
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  TODAY'S SUMMARY
  // ═══════════════════════════════════════════════

  async getTodaySummary(rider: Rider) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const riderId = new Types.ObjectId(rider._id as any);

    const [deliveryStats, earningsResult] = await Promise.all([
      // Delivery stats (count + distance)
      this.deliveryModel.aggregate([
        {
          $match: {
            rider: riderId,
            status: { $in: [DeliveryStatusEnum.DELIVERED, DeliveryStatusEnum.COMPLETED] },
            deliveredAt: { $gte: startOfDay },
          },
        },
        {
          $group: {
            _id: null,
            totalDistance: { $sum: '$estimatedDistance' },
            count: { $sum: 1 },
          },
        },
      ]),
      // Actual rider earnings (after commission, from earnings service)
      this.earningsService.getTodayEarnings(rider),
    ]);

    const stats = deliveryStats[0] || { totalDistance: 0, count: 0 };
    const todayEarnings = earningsResult?.data?.totalEarnings || 0;

    return {
      success: true,
      message: "Today's summary retrieved",
      data: {
        deliveriesCompleted: stats.count,
        totalEarnings: todayEarnings,
        totalDistance: Math.round(stats.totalDistance * 100) / 100,
        hoursOnline: 0, // Would need online time tracking — placeholder
        currency: 'NGN',
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  HELPER
  // ═══════════════════════════════════════════════

  private generatePin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
