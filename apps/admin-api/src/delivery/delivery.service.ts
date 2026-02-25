import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DeliveryRequest,
  DeliveryRequestDocument,
  Rider,
  RiderDocument,
  User,
  UserDocument,
  Payment,
  PaymentDocument,
  Dispute,
  DisputeDocument,
} from '@libs/database';
import {
  DeliveryStatusEnum,
  DeliveryTypeEnum,
  DeliveryPaymentStatusEnum,
  RiderStatusEnum,
} from '@libs/common';
import { NotificationService } from '@libs/common/modules/notification';
import { NotificationRecipientType } from '@libs/database';
import {
  AssignRiderDto,
  OverridePinDto,
  ManualCompleteDto,
  ManualCancelDto,
  AdjustPriceDto,
  UpdateDeliveryStatusDto,
  IssueRefundDto,
  DeliveryFilterDto,
} from './dto';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectModel(DeliveryRequest.name)
    private readonly deliveryModel: Model<DeliveryRequestDocument>,
    @InjectModel(Rider.name)
    private readonly riderModel: Model<RiderDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Dispute.name)
    private readonly disputeModel: Model<DisputeDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  // ── helper: log admin action on a delivery ──
  private async logAdminAction(
    deliveryId: string,
    action: string,
    reason: string,
    previousValue?: any,
    newValue?: any,
  ) {
    await this.deliveryModel.updateOne(
      { _id: deliveryId },
      {
        $push: {
          adminActions: {
            admin: new Types.ObjectId(), // TODO: pass admin id from guard
            action,
            reason,
            previousValue,
            newValue,
            performedAt: new Date(),
          },
        },
      },
    );
  }

  // ── helper: push notify user ──
  private async notifyUser(userId: Types.ObjectId | string, title: string, body: string, data?: Record<string, any>) {
    const user = await this.userModel.findById(userId).select('deviceToken').lean();
    if (user) {
      await this.notificationService.send({
        recipientId: userId instanceof Types.ObjectId ? userId : new Types.ObjectId(userId),
        recipientType: NotificationRecipientType.USER,
        title,
        body,
        token: (user as any).deviceToken,
        data,
      });
    }
  }

  // ── helper: push notify rider ──
  private async notifyRider(riderId: Types.ObjectId | string, title: string, body: string, data?: Record<string, any>) {
    const rider = await this.riderModel.findById(riderId).select('fcmToken').lean();
    if (rider) {
      await this.notificationService.send({
        recipientId: riderId instanceof Types.ObjectId ? riderId : new Types.ObjectId(riderId),
        recipientType: NotificationRecipientType.RIDER,
        title,
        body,
        token: (rider as any).fcmToken,
        data,
      });
    }
  }

  // ═══════════════════════════════════════════════
  //  DELIVERY QUERIES
  // ═══════════════════════════════════════════════

  async getAllDeliveries(filters: DeliveryFilterDto) {
    const { status, riderId, customerId, startDate, endDate, page = 1, limit = 20 } = filters;
    const query: any = {};

    if (status) query.status = status;
    if (riderId) query.rider = new Types.ObjectId(riderId);
    if (customerId) query.customer = new Types.ObjectId(customerId);
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.deliveryModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('customer', 'firstName lastName email phone')
        .populate('rider', 'firstName lastName phone vehicleType averageRating')
        .lean(),
      this.deliveryModel.countDocuments(query),
    ]);

    return {
      success: true,
      message: 'Deliveries retrieved',
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getDeliveryById(id: string) {
    const delivery = await this.deliveryModel
      .findById(id)
      .populate('customer', 'firstName lastName email phone profilePhotoUrl')
      .populate('rider', 'firstName lastName phone vehicleType vehiclePlateNumber averageRating currentLatitude currentLongitude')
      .populate('rating')
      .populate('dispute')
      .populate('payment')
      .select('+pickupPin +deliveryPin')
      .lean();

    if (!delivery) throw new NotFoundException('Delivery not found');

    return { success: true, message: 'Delivery retrieved', data: delivery };
  }

  async getPendingAssignment() {
    const data = await this.deliveryModel
      .find({
        deliveryType: DeliveryTypeEnum.SCHEDULED,
        status: { $in: [DeliveryStatusEnum.SCHEDULED, DeliveryStatusEnum.PENDING] },
        rider: { $exists: false },
      })
      .sort({ scheduledPickupTime: 1 })
      .populate('customer', 'firstName lastName phone')
      .lean();

    return { success: true, message: 'Pending assignment deliveries retrieved', data };
  }

  async getDeliveriesWithDisputes(filters: DeliveryFilterDto) {
    const { page = 1, limit = 20 } = filters;

    const [data, total] = await Promise.all([
      this.deliveryModel
        .find({ hasDispute: true })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('customer', 'firstName lastName email phone')
        .populate('rider', 'firstName lastName phone')
        .populate('dispute')
        .lean(),
      this.deliveryModel.countDocuments({ hasDispute: true }),
    ]);

    return {
      success: true,
      message: 'Deliveries with disputes retrieved',
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getDeliveryStats(filters: { startDate?: string; endDate?: string }) {
    const dateQuery: any = {};
    if (filters.startDate) dateQuery.$gte = new Date(filters.startDate);
    if (filters.endDate) dateQuery.$lte = new Date(filters.endDate);
    const dateFilter = Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {};

    const [
      totalDeliveries, completedDeliveries, cancelledDeliveries, pendingDeliveries,
      scheduledDeliveries, quickDeliveries, disputeCount, revenueResult, avgDurationResult,
    ] = await Promise.all([
      this.deliveryModel.countDocuments(dateFilter),
      this.deliveryModel.countDocuments({ ...dateFilter, status: { $in: [DeliveryStatusEnum.DELIVERED, DeliveryStatusEnum.COMPLETED] } }),
      this.deliveryModel.countDocuments({ ...dateFilter, status: DeliveryStatusEnum.CANCELLED }),
      this.deliveryModel.countDocuments({ ...dateFilter, status: { $in: [DeliveryStatusEnum.PENDING, DeliveryStatusEnum.SEARCHING_RIDER, DeliveryStatusEnum.SCHEDULED] } }),
      this.deliveryModel.countDocuments({ ...dateFilter, deliveryType: DeliveryTypeEnum.SCHEDULED }),
      this.deliveryModel.countDocuments({ ...dateFilter, deliveryType: DeliveryTypeEnum.QUICK }),
      this.deliveryModel.countDocuments({ ...dateFilter, hasDispute: true }),
      this.deliveryModel.aggregate([
        { $match: { ...dateFilter, status: { $in: [DeliveryStatusEnum.DELIVERED, DeliveryStatusEnum.COMPLETED] } } },
        { $group: { _id: null, totalRevenue: { $sum: '$pricing.totalPrice' } } },
      ]),
      this.deliveryModel.aggregate([
        { $match: { ...dateFilter, deliveredAt: { $exists: true }, createdAt: { $exists: true } } },
        { $project: { durationMinutes: { $divide: [{ $subtract: ['$deliveredAt', '$createdAt'] }, 60000] } } },
        { $group: { _id: null, avgDuration: { $avg: '$durationMinutes' } } },
      ]),
    ]);

    return {
      success: true,
      message: 'Statistics retrieved',
      data: {
        totalDeliveries,
        completedDeliveries,
        cancelledDeliveries,
        pendingDeliveries,
        scheduledDeliveries,
        quickDeliveries,
        totalRevenue: revenueResult[0]?.totalRevenue || 0,
        averageDeliveryTime: Math.round(avgDurationResult[0]?.avgDuration || 0),
        disputeRate: totalDeliveries > 0 ? Math.round((disputeCount / totalDeliveries) * 10000) / 100 : 0,
        currency: 'NGN',
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  RIDER ASSIGNMENT (scheduled deliveries)
  // ═══════════════════════════════════════════════

  async assignRider(body: AssignRiderDto) {
    const delivery = await this.deliveryModel.findById(body.deliveryId);
    if (!delivery) throw new NotFoundException('Delivery not found');

    if (delivery.rider) {
      throw new BadRequestException('Delivery already has a rider assigned. Use reassign instead.');
    }

    const validStatuses = [DeliveryStatusEnum.SCHEDULED, DeliveryStatusEnum.PENDING, DeliveryStatusEnum.SEARCHING_RIDER];
    if (!validStatuses.includes(delivery.status as DeliveryStatusEnum)) {
      throw new BadRequestException(`Cannot assign rider when delivery is in "${delivery.status}" status`);
    }

    const rider = await this.riderModel.findById(body.riderId);
    if (!rider) throw new NotFoundException('Rider not found');
    if (rider.verificationStatus !== 'verified') throw new BadRequestException('Rider is not verified');
    if (rider.currentDeliveryCount >= rider.maxConcurrentDeliveries) {
      throw new BadRequestException('Rider has reached maximum concurrent delivery limit');
    }

    // Assign
    delivery.rider = new Types.ObjectId(body.riderId) as any;
    delivery.status = DeliveryStatusEnum.RIDER_ASSIGNED;
    delivery.riderAssignedAt = new Date();
    delivery.canReschedule = false;
    await delivery.save();

    await this.riderModel.updateOne(
      { _id: body.riderId },
      { $inc: { currentDeliveryCount: 1 }, $set: { status: RiderStatusEnum.ON_DELIVERY } },
    );

    await this.logAdminAction(body.deliveryId, 'rider_assign', body.reason || 'Admin assignment', null, { riderId: body.riderId });

    // Push notifications
    await this.notifyRider(body.riderId, 'New Delivery Assigned', `You have been assigned delivery ${delivery.trackingNumber}. Check the details.`, {
      type: 'delivery_assigned', deliveryId: body.deliveryId, trackingNumber: delivery.trackingNumber,
    });
    await this.notifyUser(delivery.customer, 'Rider Assigned', `A rider has been assigned to your delivery ${delivery.trackingNumber}.`, {
      type: 'rider_assigned', deliveryId: body.deliveryId, trackingNumber: delivery.trackingNumber,
    });

    return {
      success: true,
      message: 'Rider assigned successfully',
      data: { deliveryId: body.deliveryId, riderId: body.riderId, status: DeliveryStatusEnum.RIDER_ASSIGNED },
    };
  }

  async reassignRider(body: AssignRiderDto) {
    const delivery = await this.deliveryModel.findById(body.deliveryId);
    if (!delivery) throw new NotFoundException('Delivery not found');

    const terminalStatuses = [DeliveryStatusEnum.DELIVERED, DeliveryStatusEnum.COMPLETED, DeliveryStatusEnum.CANCELLED];
    if (terminalStatuses.includes(delivery.status as DeliveryStatusEnum)) {
      throw new BadRequestException('Cannot reassign rider for a completed/cancelled delivery');
    }

    const newRider = await this.riderModel.findById(body.riderId);
    if (!newRider) throw new NotFoundException('New rider not found');
    if (newRider.verificationStatus !== 'verified') throw new BadRequestException('New rider is not verified');
    if (newRider.currentDeliveryCount >= newRider.maxConcurrentDeliveries) {
      throw new BadRequestException('New rider has reached maximum concurrent delivery limit');
    }

    const previousRiderId = delivery.rider?.toString();

    // Unassign previous rider
    if (previousRiderId) {
      await this.riderModel.updateOne({ _id: previousRiderId }, { $inc: { currentDeliveryCount: -1 } });
      await this.notifyRider(previousRiderId, 'Delivery Reassigned', `Delivery ${delivery.trackingNumber} has been reassigned to another rider.`, {
        type: 'delivery_reassigned', deliveryId: body.deliveryId,
      });
    }

    // Assign new rider
    delivery.rider = new Types.ObjectId(body.riderId) as any;
    delivery.riderAssignedAt = new Date();
    await delivery.save();

    await this.riderModel.updateOne(
      { _id: body.riderId },
      { $inc: { currentDeliveryCount: 1 }, $set: { status: RiderStatusEnum.ON_DELIVERY } },
    );

    await this.logAdminAction(body.deliveryId, 'rider_reassign', body.reason || 'Admin reassignment', { previousRiderId }, { riderId: body.riderId });

    await this.notifyRider(body.riderId, 'New Delivery Assigned', `You have been assigned delivery ${delivery.trackingNumber}.`, {
      type: 'delivery_assigned', deliveryId: body.deliveryId, trackingNumber: delivery.trackingNumber,
    });
    await this.notifyUser(delivery.customer, 'Rider Changed', `A new rider has been assigned to your delivery ${delivery.trackingNumber}.`, {
      type: 'rider_reassigned', deliveryId: body.deliveryId, trackingNumber: delivery.trackingNumber,
    });

    return {
      success: true,
      message: 'Rider reassigned successfully',
      data: { deliveryId: body.deliveryId, previousRiderId, newRiderId: body.riderId },
    };
  }

  // ═══════════════════════════════════════════════
  //  ADMIN OVERRIDES
  // ═══════════════════════════════════════════════

  async overridePin(body: OverridePinDto) {
    const delivery = await this.deliveryModel.findById(body.deliveryId);
    if (!delivery) throw new NotFoundException('Delivery not found');

    if (body.pinType === 'pickup') {
      delivery.pickupPinVerified = true;
      delivery.pickupPinOverridden = true;
      if ([DeliveryStatusEnum.RIDER_ARRIVED_PICKUP, DeliveryStatusEnum.PAYMENT_CONFIRMED].includes(delivery.status as DeliveryStatusEnum)) {
        delivery.status = DeliveryStatusEnum.PICKUP_IN_PROGRESS as any;
      }
    } else {
      delivery.deliveryPinVerified = true;
      delivery.deliveryPinOverridden = true;
      if ([DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF, DeliveryStatusEnum.DELIVERY_IN_PROGRESS].includes(delivery.status as DeliveryStatusEnum)) {
        delivery.status = DeliveryStatusEnum.DELIVERED as any;
        delivery.deliveredAt = new Date();
      }
    }
    await delivery.save();

    await this.logAdminAction(body.deliveryId, 'pin_override', body.reason, { pinType: body.pinType }, { overridden: true });

    // Notify both parties
    const msg = `${body.pinType === 'pickup' ? 'Pickup' : 'Delivery'} verification has been completed by support.`;
    await this.notifyUser(delivery.customer, 'PIN Override', msg, { type: 'pin_override', deliveryId: body.deliveryId });
    if (delivery.rider) {
      await this.notifyRider(delivery.rider, 'PIN Override', msg, { type: 'pin_override', deliveryId: body.deliveryId });
    }

    return {
      success: true,
      message: `${body.pinType} PIN overridden successfully`,
      data: { deliveryId: body.deliveryId, pinType: body.pinType, newStatus: delivery.status },
    };
  }

  async manualComplete(body: ManualCompleteDto) {
    const delivery = await this.deliveryModel.findById(body.deliveryId);
    if (!delivery) throw new NotFoundException('Delivery not found');

    if ([DeliveryStatusEnum.COMPLETED, DeliveryStatusEnum.CANCELLED].includes(delivery.status as DeliveryStatusEnum)) {
      throw new BadRequestException(`Delivery is already ${delivery.status}`);
    }

    const previousStatus = delivery.status;
    const now = new Date();
    delivery.status = DeliveryStatusEnum.COMPLETED as any;
    delivery.completedAt = now;
    delivery.deliveredAt = delivery.deliveredAt || now;
    delivery.completedByAdmin = true;
    await delivery.save();

    // Update rider stats
    if (delivery.rider) {
      await this.riderModel.updateOne(
        { _id: delivery.rider },
        { $inc: { currentDeliveryCount: -1, totalDeliveries: 1 } },
      );
      await this.notifyRider(delivery.rider, 'Delivery Completed', `Delivery ${delivery.trackingNumber} has been marked as completed by support.`, {
        type: 'delivery_completed', deliveryId: body.deliveryId,
      });
    }

    await this.logAdminAction(body.deliveryId, 'manual_complete', body.reason, { previousStatus }, { status: DeliveryStatusEnum.COMPLETED });

    await this.notifyUser(delivery.customer, 'Delivery Completed', `Your delivery ${delivery.trackingNumber} has been marked as completed.`, {
      type: 'delivery_completed', deliveryId: body.deliveryId, trackingNumber: delivery.trackingNumber,
    });

    return {
      success: true,
      message: 'Delivery manually completed',
      data: { deliveryId: body.deliveryId, previousStatus, newStatus: DeliveryStatusEnum.COMPLETED },
    };
  }

  async manualCancel(body: ManualCancelDto) {
    const delivery = await this.deliveryModel.findById(body.deliveryId);
    if (!delivery) throw new NotFoundException('Delivery not found');

    if ([DeliveryStatusEnum.COMPLETED, DeliveryStatusEnum.CANCELLED].includes(delivery.status as DeliveryStatusEnum)) {
      throw new BadRequestException(`Delivery is already ${delivery.status}`);
    }

    const previousStatus = delivery.status;
    delivery.status = DeliveryStatusEnum.CANCELLED as any;
    delivery.cancelledAt = new Date();
    delivery.cancellationReason = body.reason;
    delivery.cancelledBy = 'admin';
    delivery.cancelledByAdmin = true;
    await delivery.save();

    // Release rider
    if (delivery.rider) {
      await this.riderModel.updateOne({ _id: delivery.rider }, { $inc: { currentDeliveryCount: -1 } });
      await this.notifyRider(delivery.rider, 'Delivery Cancelled', `Delivery ${delivery.trackingNumber} has been cancelled by admin: ${body.reason}`, {
        type: 'delivery_cancelled', deliveryId: body.deliveryId,
      });
    }

    await this.logAdminAction(body.deliveryId, 'manual_cancel', body.reason, { previousStatus }, { status: DeliveryStatusEnum.CANCELLED });

    // Process refund if requested
    let refundData: any = null;
    if (body.issueRefund && delivery.paymentStatus === DeliveryPaymentStatusEnum.PAID) {
      const refundAmount = body.refundAmount || delivery.pricing.totalPrice;
      await this.deliveryModel.updateOne(
        { _id: body.deliveryId },
        { $set: { paymentStatus: refundAmount >= delivery.pricing.totalPrice ? DeliveryPaymentStatusEnum.REFUNDED : DeliveryPaymentStatusEnum.PARTIALLY_REFUNDED } },
      );
      refundData = { refundAmount, currency: delivery.pricing.currency, status: 'processing' };
    }

    await this.notifyUser(delivery.customer, 'Delivery Cancelled', `Your delivery ${delivery.trackingNumber} has been cancelled by support. ${refundData ? 'A refund is being processed.' : ''}`, {
      type: 'delivery_cancelled', deliveryId: body.deliveryId, trackingNumber: delivery.trackingNumber,
    });

    return {
      success: true,
      message: 'Delivery manually cancelled',
      data: { deliveryId: body.deliveryId, previousStatus, newStatus: DeliveryStatusEnum.CANCELLED, refund: refundData },
    };
  }

  async adjustPrice(body: AdjustPriceDto) {
    const delivery = await this.deliveryModel.findById(body.deliveryId);
    if (!delivery) throw new NotFoundException('Delivery not found');

    if ([DeliveryStatusEnum.COMPLETED, DeliveryStatusEnum.CANCELLED].includes(delivery.status as DeliveryStatusEnum)) {
      throw new BadRequestException('Cannot adjust price for completed or cancelled delivery');
    }

    const previousPrice = delivery.pricing.totalPrice;
    await this.deliveryModel.updateOne(
      { _id: body.deliveryId },
      { $set: { 'pricing.totalPrice': body.newTotalPrice } },
    );

    await this.logAdminAction(body.deliveryId, 'price_adjustment', body.reason, { totalPrice: previousPrice }, { totalPrice: body.newTotalPrice });

    await this.notifyUser(delivery.customer, 'Price Updated', `The price for delivery ${delivery.trackingNumber} has been updated from ₦${previousPrice.toLocaleString()} to ₦${body.newTotalPrice.toLocaleString()}.`, {
      type: 'price_adjusted', deliveryId: body.deliveryId,
    });

    return {
      success: true,
      message: 'Price adjusted successfully',
      data: { deliveryId: body.deliveryId, previousPrice, newPrice: body.newTotalPrice, difference: body.newTotalPrice - previousPrice },
    };
  }

  async updateStatus(body: UpdateDeliveryStatusDto) {
    const delivery = await this.deliveryModel.findById(body.deliveryId);
    if (!delivery) throw new NotFoundException('Delivery not found');

    const previousStatus = delivery.status;
    const updateFields: any = { status: body.status };

    // Set relevant timestamps
    switch (body.status) {
      case DeliveryStatusEnum.RIDER_ARRIVED_PICKUP: updateFields.arrivedAtPickupAt = new Date(); break;
      case DeliveryStatusEnum.PICKED_UP: updateFields.pickedUpAt = new Date(); break;
      case DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF: updateFields.arrivedAtDropoffAt = new Date(); break;
      case DeliveryStatusEnum.DELIVERED: updateFields.deliveredAt = new Date(); break;
      case DeliveryStatusEnum.COMPLETED: updateFields.completedAt = new Date(); break;
      case DeliveryStatusEnum.CANCELLED: updateFields.cancelledAt = new Date(); updateFields.cancelledBy = 'admin'; break;
    }

    await this.deliveryModel.updateOne({ _id: body.deliveryId }, { $set: updateFields });
    await this.logAdminAction(body.deliveryId, 'status_update', body.reason || 'Admin status override', { status: previousStatus }, { status: body.status });

    await this.notifyUser(delivery.customer, 'Delivery Update', `Your delivery ${delivery.trackingNumber} status has been updated.`, {
      type: 'status_updated', deliveryId: body.deliveryId, status: body.status,
    });

    return {
      success: true,
      message: 'Status updated successfully',
      data: { deliveryId: body.deliveryId, previousStatus, newStatus: body.status },
    };
  }

  // ═══════════════════════════════════════════════
  //  REFUNDS
  // ═══════════════════════════════════════════════

  async issueRefund(body: IssueRefundDto) {
    const delivery = await this.deliveryModel.findById(body.deliveryId);
    if (!delivery) throw new NotFoundException('Delivery not found');

    if (delivery.paymentStatus !== DeliveryPaymentStatusEnum.PAID) {
      throw new BadRequestException('Delivery payment status is not "paid". Cannot issue refund.');
    }

    if (body.amount > delivery.pricing.totalPrice) {
      throw new BadRequestException('Refund amount exceeds delivery price');
    }

    const isFullRefund = body.refundType === 'full' || body.amount >= delivery.pricing.totalPrice;

    await this.deliveryModel.updateOne(
      { _id: body.deliveryId },
      {
        $set: {
          paymentStatus: isFullRefund
            ? DeliveryPaymentStatusEnum.REFUNDED
            : DeliveryPaymentStatusEnum.PARTIALLY_REFUNDED,
        },
      },
    );

    await this.logAdminAction(body.deliveryId, 'refund_issued', body.reason, { paymentStatus: delivery.paymentStatus }, {
      paymentStatus: isFullRefund ? DeliveryPaymentStatusEnum.REFUNDED : DeliveryPaymentStatusEnum.PARTIALLY_REFUNDED,
      refundAmount: body.amount,
    });

    await this.notifyUser(delivery.customer, 'Refund Processed', `A ${isFullRefund ? 'full' : 'partial'} refund of ₦${body.amount.toLocaleString()} has been issued for delivery ${delivery.trackingNumber}.`, {
      type: 'refund_issued', deliveryId: body.deliveryId, refundAmount: body.amount,
    });

    return {
      success: true,
      message: 'Refund issued successfully',
      data: {
        deliveryId: body.deliveryId,
        refundAmount: body.amount,
        refundType: isFullRefund ? 'full' : 'partial',
        newPaymentStatus: isFullRefund ? DeliveryPaymentStatusEnum.REFUNDED : DeliveryPaymentStatusEnum.PARTIALLY_REFUNDED,
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  AUDIT
  // ═══════════════════════════════════════════════

  async getAdminActions(id: string) {
    const delivery = await this.deliveryModel.findById(id).select('adminActions trackingNumber').lean();
    if (!delivery) throw new NotFoundException('Delivery not found');

    return {
      success: true,
      message: 'Admin actions retrieved',
      data: delivery.adminActions || [],
    };
  }

  async getDeliveryTimeline(id: string) {
    const delivery = await this.deliveryModel
      .findById(id)
      .populate('rider', 'firstName lastName')
      .populate('customer', 'firstName lastName')
      .lean();

    if (!delivery) throw new NotFoundException('Delivery not found');

    // Build timeline from timestamps
    const timeline: { event: string; timestamp: Date; details?: string }[] = [];

    if (delivery.createdAt) timeline.push({ event: 'Delivery Created', timestamp: delivery.createdAt, details: `Type: ${delivery.deliveryType}, Tracking: ${delivery.trackingNumber}` });
    if (delivery.riderAssignedAt) timeline.push({ event: 'Rider Assigned', timestamp: delivery.riderAssignedAt });
    if (delivery.riderAcceptedAt) timeline.push({ event: 'Rider Accepted', timestamp: delivery.riderAcceptedAt });
    if (delivery.arrivedAtPickupAt) timeline.push({ event: 'Arrived at Pickup', timestamp: delivery.arrivedAtPickupAt });
    if (delivery.pickedUpAt) timeline.push({ event: 'Parcel Picked Up', timestamp: delivery.pickedUpAt });
    if (delivery.arrivedAtDropoffAt) timeline.push({ event: 'Arrived at Drop-off', timestamp: delivery.arrivedAtDropoffAt });
    if (delivery.deliveredAt) timeline.push({ event: 'Delivered', timestamp: delivery.deliveredAt });
    if (delivery.completedAt) timeline.push({ event: 'Completed', timestamp: delivery.completedAt });
    if (delivery.cancelledAt) timeline.push({ event: 'Cancelled', timestamp: delivery.cancelledAt, details: `Reason: ${delivery.cancellationReason || 'N/A'}, By: ${delivery.cancelledBy}` });

    // Add admin actions
    if (delivery.adminActions?.length) {
      delivery.adminActions.forEach((a) => {
        timeline.push({ event: `Admin: ${a.action}`, timestamp: a.performedAt, details: a.reason });
      });
    }

    // Sort chronologically
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return { success: true, message: 'Timeline retrieved', data: timeline };
  }
}
