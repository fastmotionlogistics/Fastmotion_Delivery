import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import {
  Dispute,
  DisputeDocument,
  DeliveryRequest,
  DeliveryRequestDocument,
  Payment,
  PaymentDocument,
  Rider,
  RiderDocument,
} from '@libs/database';
import { DisputeMessage } from '@libs/database/schemas/dispute.schema';

@Injectable()
export class DisputeRepository {
  constructor(
    @InjectModel(Dispute.name)
    readonly disputeModel: Model<DisputeDocument>,
    @InjectModel(DeliveryRequest.name)
    readonly deliveryModel: Model<DeliveryRequestDocument>,
    @InjectModel(Payment.name)
    readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Rider.name)
    readonly riderModel: Model<RiderDocument>,
  ) {}

  // Dispute methods
  async create(data: Partial<Dispute>): Promise<Dispute> {
    const dispute = new this.disputeModel({
      ...data,
      _id: new Types.ObjectId(),
    });
    return dispute.save();
  }

  async findById(id: string | Types.ObjectId): Promise<Dispute | null> {
    return this.disputeModel.findById(id).lean();
  }

  async findByIdWithRelations(id: string | Types.ObjectId): Promise<Dispute | null> {
    return this.disputeModel
      .findById(id)
      .populate('customer', 'firstName lastName email phoneNumber')
      .populate('rider', 'firstName lastName profilePhoto')
      .populate('deliveryRequest', 'trackingNumber status pricing')
      .populate('assignedTo', 'firstName lastName')
      .lean();
  }

  async findByTicketNumber(ticketNumber: string): Promise<Dispute | null> {
    return this.disputeModel.findOne({ ticketNumber }).lean();
  }

  async findByDeliveryRequest(deliveryRequestId: Types.ObjectId): Promise<Dispute | null> {
    return this.disputeModel.findOne({ deliveryRequest: deliveryRequestId }).lean();
  }

  async findByCustomer(
    customerId: Types.ObjectId,
    filters: { status?: string; page?: number; limit?: number } = {},
  ): Promise<{ data: Dispute[]; total: number }> {
    const { status, page = 1, limit = 20 } = filters;
    const query: FilterQuery<Dispute> = { customer: customerId };

    if (status) {
      query.status = status;
    }

    const [data, total] = await Promise.all([
      this.disputeModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('deliveryRequest', 'trackingNumber status')
        .populate('rider', 'firstName lastName')
        .lean(),
      this.disputeModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async updateById(
    id: string | Types.ObjectId,
    update: Partial<Dispute>,
  ): Promise<Dispute | null> {
    return this.disputeModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .lean();
  }

  async addMessage(
    id: string | Types.ObjectId,
    message: DisputeMessage,
  ): Promise<Dispute | null> {
    return this.disputeModel
      .findByIdAndUpdate(
        id,
        { $push: { messages: message } },
        { new: true },
      )
      .lean();
  }

  async addAttachments(
    id: string | Types.ObjectId,
    attachments: string[],
  ): Promise<Dispute | null> {
    return this.disputeModel
      .findByIdAndUpdate(
        id,
        { $push: { attachments: { $each: attachments } } },
        { new: true },
      )
      .lean();
  }

  async updateStatus(
    id: string | Types.ObjectId,
    status: string,
    additionalFields: Partial<Dispute> = {},
  ): Promise<Dispute | null> {
    return this.disputeModel
      .findByIdAndUpdate(
        id,
        { $set: { status, ...additionalFields } },
        { new: true },
      )
      .lean();
  }

  // Delivery methods
  async findDeliveryById(id: string | Types.ObjectId): Promise<DeliveryRequest | null> {
    return this.deliveryModel.findById(id).lean();
  }

  async updateDeliveryDispute(
    id: string | Types.ObjectId,
    disputeId: Types.ObjectId,
  ): Promise<DeliveryRequest | null> {
    return this.deliveryModel
      .findByIdAndUpdate(
        id,
        { $set: { dispute: disputeId, hasDispute: true } },
        { new: true },
      )
      .lean();
  }

  // Payment methods
  async findPaymentByDelivery(deliveryId: Types.ObjectId): Promise<Payment | null> {
    return this.paymentModel
      .findOne({ deliveryRequest: deliveryId, isRefund: false })
      .lean();
  }

  // Helper methods
  generateTicketNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `DSP${timestamp}${random}`;
  }

  // Check if customer can create dispute for this delivery
  async canCreateDispute(
    customerId: Types.ObjectId,
    deliveryRequestId: Types.ObjectId,
  ): Promise<{ canCreate: boolean; reason?: string }> {
    const delivery = await this.deliveryModel.findById(deliveryRequestId).lean();

    if (!delivery) {
      return { canCreate: false, reason: 'Delivery not found' };
    }

    if (delivery.customer.toString() !== customerId.toString()) {
      return { canCreate: false, reason: 'Not authorized to create dispute for this delivery' };
    }

    // Check if dispute already exists
    const existingDispute = await this.disputeModel
      .findOne({ deliveryRequest: deliveryRequestId })
      .lean();

    if (existingDispute) {
      return {
        canCreate: false,
        reason: `A dispute already exists for this delivery (Ticket: ${existingDispute.ticketNumber})`,
      };
    }

    // Disputes can be created for delivered, completed, cancelled, or failed deliveries
    const allowedStatuses = ['delivered', 'completed', 'cancelled', 'failed', 'in_transit'];
    if (!allowedStatuses.includes(delivery.status)) {
      return {
        canCreate: false,
        reason: 'Disputes can only be created for completed or cancelled deliveries',
      };
    }

    // Check time limit (within 7 days of completion/cancellation)
    const completionDate = delivery.completedAt || delivery.cancelledAt || delivery.deliveredAt;
    if (completionDate) {
      const daysSinceCompletion =
        (new Date().getTime() - new Date(completionDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCompletion > 7) {
        return {
          canCreate: false,
          reason: 'Disputes must be created within 7 days of delivery completion',
        };
      }
    }

    return { canCreate: true };
  }

  // Get dispute statistics for a customer
  async getCustomerDisputeStats(customerId: Types.ObjectId): Promise<{
    total: number;
    open: number;
    inReview: number;
    resolved: number;
    closed: number;
  }> {
    const stats = await this.disputeModel.aggregate([
      { $match: { customer: customerId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      total: 0,
      open: 0,
      inReview: 0,
      resolved: 0,
      closed: 0,
    };

    stats.forEach((stat) => {
      result.total += stat.count;
      switch (stat._id) {
        case 'open':
          result.open = stat.count;
          break;
        case 'in_review':
          result.inReview = stat.count;
          break;
        case 'resolved':
          result.resolved = stat.count;
          break;
        case 'closed':
          result.closed = stat.count;
          break;
      }
    });

    return result;
  }

  // Get priority based on reason
  getPriorityFromReason(reason: string): string {
    const highPriorityReasons = ['parcel_lost', 'parcel_damaged', 'delivery_not_completed'];
    const mediumPriorityReasons = ['wrong_delivery', 'rider_misconduct', 'overcharged'];

    if (highPriorityReasons.includes(reason)) {
      return 'high';
    }
    if (mediumPriorityReasons.includes(reason)) {
      return 'medium';
    }
    return 'low';
  }
}
