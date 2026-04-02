import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
import { PaymentService } from '../payment.service';

interface DeliveryRefundRequestedPayload {
  deliveryId: string;
  customerId: string;
  amount: number;
  reason: string;
}

@Injectable()
export class RefundListener {
  private readonly logger = new Logger(RefundListener.name);

  constructor(private readonly paymentService: PaymentService) {}

  @OnEvent('delivery.refund.requested', { async: true })
  async handleDeliveryRefund(payload: DeliveryRefundRequestedPayload) {
    const { deliveryId, customerId, amount, reason } = payload;
    try {
      await this.paymentService.processRefund(
        new Types.ObjectId(customerId),
        new Types.ObjectId(deliveryId),
        amount,
        reason,
      );
      this.logger.log(`Refund of ₦${amount} credited to user ${customerId} for delivery ${deliveryId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process refund for delivery ${deliveryId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
