import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import {
  Dispute,
  DisputeDocument,
  User,
  UserDocument,
  Rider,
  RiderDocument,
  DeliveryRequest,
  DeliveryRequestDocument,
} from '@libs/database';
import { NotificationService } from '@libs/common/modules/notification';
import { NotificationRecipientType } from '@libs/database';
import { DisputeStatusEnum } from '@libs/common';
import { DisputeMessage } from '@libs/database/schemas/dispute.schema';
import {
  UpdateDisputeStatusDto,
  AddAdminMessageDto,
  AssignDisputeDto,
} from './dto';

// Map status → user-friendly notification
const STATUS_NOTIF_MAP: Record<string, { title: string; body: string; type: string }> = {
  [DisputeStatusEnum.IN_REVIEW]: {
    title: 'Dispute Under Review 🔍',
    body: 'Your dispute is now being reviewed by our support team.',
    type: 'dispute_in_review',
  },
  [DisputeStatusEnum.RESOLVED]: {
    title: 'Dispute Resolved ✅',
    body: 'Your dispute has been resolved. Please check the resolution details.',
    type: 'dispute_resolved',
  },
  [DisputeStatusEnum.CLOSED]: {
    title: 'Dispute Closed',
    body: 'Your dispute has been closed.',
    type: 'dispute_closed',
  },
  [DisputeStatusEnum.ESCALATED]: {
    title: 'Dispute Escalated ⬆️',
    body: 'Your dispute has been escalated to a senior support agent for further review.',
    type: 'dispute_escalated',
  },
};

@Injectable()
export class AdminDisputeService {
  constructor(
    @InjectModel(Dispute.name)
    private readonly disputeModel: Model<DisputeDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Rider.name)
    private readonly riderModel: Model<RiderDocument>,
    @InjectModel(DeliveryRequest.name)
    private readonly deliveryModel: Model<DeliveryRequestDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  // ── Get all disputes (admin) ──────────────────────
  async getAllDisputes(filters: {
    status?: string;
    priority?: string;
    reason?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, priority, reason, page = 1, limit = 20 } = filters;
    const query: FilterQuery<Dispute> = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (reason) query.reason = reason;

    const [data, total] = await Promise.all([
      this.disputeModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('customer', 'firstName lastName email phone')
        .populate('rider', 'firstName lastName')
        .populate('deliveryRequest', 'trackingNumber status pricing')
        .populate('assignedTo', 'firstName lastName')
        .lean(),
      this.disputeModel.countDocuments(query),
    ]);

    // Stats
    const statsAgg = await this.disputeModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const stats: Record<string, number> = { total: 0 };
    statsAgg.forEach((s) => {
      stats[s._id] = s.count;
      stats.total += s.count;
    });

    return {
      success: true,
      message: 'Disputes retrieved',
      data: { disputes: data, stats },
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  // ── Get dispute by ID ─────────────────────────────
  async getDisputeById(id: string) {
    const dispute = await this.disputeModel
      .findById(id)
      .populate('customer', 'firstName lastName email phone profilePhotoUrl fcmToken')
      .populate('rider', 'firstName lastName phone')
      .populate('deliveryRequest', 'trackingNumber status pricing pickupLocation dropoffLocation')
      .populate('assignedTo', 'firstName lastName')
      .lean();

    if (!dispute) throw new NotFoundException('Dispute not found');

    return { success: true, message: 'Dispute retrieved', data: { dispute } };
  }

  // ── Update dispute status ─────────────────────────
  async updateDisputeStatus(adminId: string, dto: UpdateDisputeStatusDto) {
    const dispute = await this.disputeModel.findById(dto.disputeId).lean();
    if (!dispute) throw new NotFoundException('Dispute not found');

    const update: Record<string, any> = { status: dto.status };

    if (dto.resolution) update.resolution = dto.resolution;
    if (dto.status === DisputeStatusEnum.RESOLVED) {
      update.resolvedAt = new Date();
      update.resolvedBy = new Types.ObjectId(adminId);
    }
    if (dto.refundApproved !== undefined) {
      update.refundApproved = dto.refundApproved;
    }

    // Add system message
    const sysMsg: DisputeMessage = {
      senderId: new Types.ObjectId(adminId),
      senderType: 'admin',
      message: dto.resolution
        ? `Status changed to ${dto.status}. Resolution: ${dto.resolution}`
        : `Dispute status updated to ${dto.status}`,
      attachments: [],
      createdAt: new Date(),
    };

    const updated = await this.disputeModel.findByIdAndUpdate(
      dto.disputeId,
      { $set: update, $push: { messages: sysMsg } },
      { new: true },
    ).lean();

    // ── Notify customer ─────────────────────────────
    const notifInfo = STATUS_NOTIF_MAP[dto.status];
    if (notifInfo) {
      const customer = await this.userModel
        .findById(dispute.customer)
        .select('fcmToken email')
        .lean();

      let body = notifInfo.body;
      if (dto.status === DisputeStatusEnum.RESOLVED && dto.refundApproved) {
        body = `Your dispute has been resolved and a refund of ₦${dispute.refundAmount?.toLocaleString() || '0'} has been approved.`;
      }

      await this.notificationService.send({
        recipientId: dispute.customer,
        recipientType: NotificationRecipientType.USER,
        title: notifInfo.title,
        body,
        token: customer?.fcmToken,
        data: {
          type: notifInfo.type,
          disputeId: dispute._id.toString(),
          ticketNumber: dispute.ticketNumber,
        },
      });
    }

    return {
      success: true,
      message: `Dispute status updated to ${dto.status}`,
      data: { dispute: updated },
    };
  }

  // ── Add admin message ─────────────────────────────
  async addAdminMessage(adminId: string, dto: AddAdminMessageDto) {
    const dispute = await this.disputeModel.findById(dto.disputeId).lean();
    if (!dispute) throw new NotFoundException('Dispute not found');

    const message: DisputeMessage = {
      senderId: new Types.ObjectId(adminId),
      senderType: 'admin',
      message: dto.message,
      attachments: dto.attachments || [],
      createdAt: new Date(),
    };

    const updated = await this.disputeModel.findByIdAndUpdate(
      dto.disputeId,
      { $push: { messages: message } },
      { new: true },
    ).lean();

    // Notify customer of new message
    const customer = await this.userModel
      .findById(dispute.customer)
      .select('fcmToken email')
      .lean();

    await this.notificationService.send({
      recipientId: dispute.customer,
      recipientType: NotificationRecipientType.USER,
      title: 'New Message on Your Dispute 💬',
      body: `Support has responded to your dispute (${dispute.ticketNumber}). Tap to view.`,
      token: customer?.fcmToken,
      data: {
        type: 'dispute_message',
        disputeId: dispute._id.toString(),
        ticketNumber: dispute.ticketNumber,
      },
    });

    return {
      success: true,
      message: 'Admin message added',
      data: { messagesCount: updated?.messages?.length || 0 },
    };
  }

  // ── Assign dispute to admin ───────────────────────
  async assignDispute(dto: AssignDisputeDto) {
    const dispute = await this.disputeModel.findById(dto.disputeId).lean();
    if (!dispute) throw new NotFoundException('Dispute not found');

    await this.disputeModel.findByIdAndUpdate(dto.disputeId, {
      $set: {
        assignedTo: new Types.ObjectId(dto.adminId),
        assignedAt: new Date(),
        status:
          dispute.status === DisputeStatusEnum.OPEN
            ? DisputeStatusEnum.IN_REVIEW
            : dispute.status,
      },
    });

    // Notify customer if status changed to in_review
    if (dispute.status === DisputeStatusEnum.OPEN) {
      const customer = await this.userModel
        .findById(dispute.customer)
        .select('fcmToken')
        .lean();

      await this.notificationService.send({
        recipientId: dispute.customer,
        recipientType: NotificationRecipientType.USER,
        title: 'Dispute Under Review 🔍',
        body: `Your dispute (${dispute.ticketNumber}) has been assigned to a support agent.`,
        token: customer?.fcmToken,
        data: {
          type: 'dispute_in_review',
          disputeId: dispute._id.toString(),
          ticketNumber: dispute.ticketNumber,
        },
      });
    }

    return { success: true, message: 'Dispute assigned' };
  }
}
