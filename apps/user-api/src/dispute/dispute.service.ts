import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
import { User } from '@libs/database';
import { DisputeReasonEnum, DisputeStatusEnum } from '@libs/common';
import { DisputeRepository } from './repository';
import { CreateDisputeDto, AddDisputeMessageDto, UpdateDisputeDto } from './dto';
import { DisputeMessage } from '@libs/database/schemas/dispute.schema';

@Injectable()
export class DisputeService {
  constructor(
    private readonly disputeRepository: DisputeRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createDispute(user: User, body: CreateDisputeDto) {
    const userId = new Types.ObjectId(user._id);
    const deliveryId = new Types.ObjectId(body.deliveryRequestId);

    // Check if customer can create dispute
    const canCreate = await this.disputeRepository.canCreateDispute(userId, deliveryId);
    if (!canCreate.canCreate) {
      throw new BadRequestException(canCreate.reason);
    }

    // Get delivery to get rider info
    const delivery = await this.disputeRepository.findDeliveryById(deliveryId);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    // Get payment info if refund requested
    let refundAmount: number | undefined;
    if (body.requestRefund) {
      const payment = await this.disputeRepository.findPaymentByDelivery(deliveryId);
      if (payment) {
        refundAmount = payment.amount - (payment.refundedAmount || 0);
      }
    }

    // Generate ticket number
    const ticketNumber = this.disputeRepository.generateTicketNumber();

    // Determine priority based on reason
    const priority = this.disputeRepository.getPriorityFromReason(body.reason);

    // Create initial message from description
    const initialMessage: DisputeMessage = {
      senderId: userId,
      senderType: 'customer',
      message: body.description,
      attachments: body.attachments || [],
      createdAt: new Date(),
    };

    // Create dispute
    const dispute = await this.disputeRepository.create({
      ticketNumber,
      deliveryRequest: deliveryId,
      customer: userId,
      rider: delivery.rider,
      reason: body.reason,
      description: body.description,
      status: DisputeStatusEnum.OPEN,
      priority,
      attachments: body.attachments || [],
      messages: [initialMessage],
      refundRequested: body.requestRefund || false,
      refundAmount,
    });

    // Update delivery with dispute reference
    await this.disputeRepository.updateDeliveryDispute(deliveryId, dispute._id);

    // Emit dispute created event
    this.eventEmitter.emit('dispute.created', {
      disputeId: dispute._id,
      ticketNumber,
      deliveryId,
      customerId: userId,
      riderId: delivery.rider,
      reason: body.reason,
      priority,
      refundRequested: body.requestRefund,
    });

    return {
      success: true,
      message: 'Dispute submitted successfully',
      data: {
        dispute: {
          id: dispute._id,
          ticketNumber: dispute.ticketNumber,
          reason: dispute.reason,
          status: dispute.status,
          priority: dispute.priority,
          refundRequested: dispute.refundRequested,
          refundAmount: dispute.refundAmount,
          createdAt: dispute.createdAt,
        },
      },
    };
  }

  async getDisputeById(user: User, id: string) {
    const userId = new Types.ObjectId(user._id);

    const dispute = await this.disputeRepository.findByIdWithRelations(id);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Verify ownership — customer may be populated (object) or just an ObjectId
    const customerId = (dispute.customer as any)?._id || dispute.customer;
    if (customerId.toString() !== userId.toString()) {
      throw new ForbiddenException('You do not have access to this dispute');
    }

    return {
      success: true,
      message: 'Dispute retrieved',
      data: {
        dispute: {
          id: dispute._id,
          ticketNumber: dispute.ticketNumber,
          reason: dispute.reason,
          description: dispute.description,
          status: dispute.status,
          priority: dispute.priority,
          attachments: dispute.attachments,
          messages: dispute.messages?.map((msg) => ({
            senderType: msg.senderType,
            message: msg.message,
            attachments: msg.attachments,
            createdAt: msg.createdAt,
          })),
          resolution: dispute.resolution,
          resolvedAt: dispute.resolvedAt,
          refundRequested: dispute.refundRequested,
          refundAmount: dispute.refundAmount,
          refundApproved: dispute.refundApproved,
          rider: dispute.rider,
          deliveryRequest: dispute.deliveryRequest,
          createdAt: dispute.createdAt,
          updatedAt: dispute.updatedAt,
        },
      },
    };
  }

  async getDisputeByDelivery(user: User, deliveryId: string) {
    const userId = new Types.ObjectId(user._id);
    const deliveryObjectId = new Types.ObjectId(deliveryId);

    // Verify delivery ownership
    const delivery = await this.disputeRepository.findDeliveryById(deliveryObjectId);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.customer.toString() !== userId.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    const dispute = await this.disputeRepository.findByDeliveryRequest(deliveryObjectId);
    if (!dispute) {
      return {
        success: true,
        message: 'No dispute found for this delivery',
        data: {
          hasDispute: false,
          dispute: null,
        },
      };
    }

    return {
      success: true,
      message: 'Dispute retrieved',
      data: {
        hasDispute: true,
        dispute: {
          id: dispute._id,
          ticketNumber: dispute.ticketNumber,
          reason: dispute.reason,
          status: dispute.status,
          priority: dispute.priority,
          refundRequested: dispute.refundRequested,
          refundApproved: dispute.refundApproved,
          createdAt: dispute.createdAt,
        },
      },
    };
  }

  async getMyDisputes(
    user: User,
    filters: { status?: string; page?: number; limit?: number },
  ) {
    const userId = new Types.ObjectId(user._id);

    const { data, total } = await this.disputeRepository.findByCustomer(userId, filters);

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    // Get stats
    const stats = await this.disputeRepository.getCustomerDisputeStats(userId);

    return {
      success: true,
      message: 'Disputes retrieved',
      data: {
        disputes: data.map((dispute) => ({
          id: dispute._id,
          ticketNumber: dispute.ticketNumber,
          reason: dispute.reason,
          status: dispute.status,
          priority: dispute.priority,
          refundRequested: dispute.refundRequested,
          refundApproved: dispute.refundApproved,
          rider: dispute.rider,
          deliveryRequest: dispute.deliveryRequest,
          createdAt: dispute.createdAt,
        })),
        stats,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    };
  }

  async addDisputeMessage(user: User, id: string, body: AddDisputeMessageDto) {
    const userId = new Types.ObjectId(user._id);

    // Find dispute
    const dispute = await this.disputeRepository.findById(id);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Verify ownership
    if (dispute.customer.toString() !== userId.toString()) {
      throw new ForbiddenException('You do not have access to this dispute');
    }

    // Check if dispute is still open for messages
    const closedStatuses = [DisputeStatusEnum.RESOLVED, DisputeStatusEnum.CLOSED];
    if (closedStatuses.includes(dispute.status as DisputeStatusEnum)) {
      throw new BadRequestException('Cannot add messages to a closed dispute');
    }

    // Create message
    const message: DisputeMessage = {
      senderId: userId,
      senderType: 'customer',
      message: body.message,
      attachments: body.attachments || [],
      createdAt: new Date(),
    };

    // Add message to dispute
    const updatedDispute = await this.disputeRepository.addMessage(id, message);

    // Emit message added event
    this.eventEmitter.emit('dispute.message.added', {
      disputeId: dispute._id,
      ticketNumber: dispute.ticketNumber,
      senderId: userId,
      senderType: 'customer',
    });

    return {
      success: true,
      message: 'Message added to dispute',
      data: {
        dispute: {
          id: updatedDispute?._id,
          ticketNumber: updatedDispute?.ticketNumber,
          messagesCount: updatedDispute?.messages?.length || 0,
        },
      },
    };
  }

  async updateDispute(user: User, id: string, body: UpdateDisputeDto) {
    const userId = new Types.ObjectId(user._id);

    // Find dispute
    const dispute = await this.disputeRepository.findById(id);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Verify ownership
    if (dispute.customer.toString() !== userId.toString()) {
      throw new ForbiddenException('You do not have access to this dispute');
    }

    // Check if dispute can be updated
    const closedStatuses = [DisputeStatusEnum.RESOLVED, DisputeStatusEnum.CLOSED];
    if (closedStatuses.includes(dispute.status as DisputeStatusEnum)) {
      throw new BadRequestException('Cannot update a closed dispute');
    }

    // Update dispute
    const updateData: Partial<typeof dispute> = {};
    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    // Add new attachments if provided
    if (body.attachments && body.attachments.length > 0) {
      await this.disputeRepository.addAttachments(id, body.attachments);
    }

    const updatedDispute = await this.disputeRepository.updateById(id, updateData);

    return {
      success: true,
      message: 'Dispute updated',
      data: {
        dispute: {
          id: updatedDispute?._id,
          ticketNumber: updatedDispute?.ticketNumber,
          description: updatedDispute?.description,
          updatedAt: updatedDispute?.updatedAt,
        },
      },
    };
  }

  async getDisputeReasons() {
    const reasonDescriptions: Record<string, string> = {
      [DisputeReasonEnum.DELIVERY_NOT_COMPLETED]:
        'The delivery was not completed as expected',
      [DisputeReasonEnum.PARCEL_DAMAGED]: 'The parcel arrived damaged',
      [DisputeReasonEnum.PARCEL_LOST]: 'The parcel was lost during delivery',
      [DisputeReasonEnum.WRONG_DELIVERY]:
        'The parcel was delivered to the wrong location or recipient',
      [DisputeReasonEnum.LATE_DELIVERY]: 'The delivery was significantly delayed',
      [DisputeReasonEnum.RIDER_MISCONDUCT]:
        'The rider behaved unprofessionally or inappropriately',
      [DisputeReasonEnum.OVERCHARGED]: 'I was charged more than the quoted price',
      [DisputeReasonEnum.OTHER]: 'Other issue not listed above',
    };

    return {
      success: true,
      message: 'Dispute reasons retrieved',
      data: Object.values(DisputeReasonEnum).map((reason) => ({
        value: reason,
        label: reason
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        description: reasonDescriptions[reason] || '',
      })),
    };
  }

  // Check if customer can create dispute for a delivery
  async canCreateDisputeForDelivery(user: User, deliveryId: string) {
    const userId = new Types.ObjectId(user._id);
    const deliveryObjectId = new Types.ObjectId(deliveryId);

    const canCreate = await this.disputeRepository.canCreateDispute(
      userId,
      deliveryObjectId,
    );

    return {
      success: true,
      message: canCreate.canCreate ? 'Dispute can be created' : canCreate.reason,
      data: {
        canCreate: canCreate.canCreate,
        reason: canCreate.reason,
      },
    };
  }

  // Get dispute statistics for the current user
  async getMyDisputeStats(user: User) {
    const userId = new Types.ObjectId(user._id);

    const stats = await this.disputeRepository.getCustomerDisputeStats(userId);

    return {
      success: true,
      message: 'Dispute statistics retrieved',
      data: { stats },
    };
  }
}
