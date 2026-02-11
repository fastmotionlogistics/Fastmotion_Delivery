import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
import { User } from '@libs/database';
import {
  DeliveryPaymentStatusEnum,
  DeliveryPaymentMethodEnum,
  DeliveryStatusEnum,
} from '@libs/common';
import { PaymentRepository } from './repository';
import { InitiatePaymentDto, FundWalletDto, VerifyPaymentDto, WithdrawDto } from './dto';
import { TransactionCategory } from '@libs/database/schemas/walletTransaction.schema';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async initiatePayment(user: User, body: InitiatePaymentDto) {
    const userId = new Types.ObjectId(user._id);
    const deliveryId = new Types.ObjectId(body.deliveryRequestId);

    // Get delivery request
    const delivery = await this.paymentRepository.findDeliveryById(deliveryId);
    if (!delivery) {
      throw new NotFoundException('Delivery request not found');
    }

    // Verify ownership
    if (delivery.customer.toString() !== userId.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    // Check if payment already exists
    const existingPayment = await this.paymentRepository.findPaymentByDelivery(deliveryId);
    if (existingPayment && existingPayment.status === DeliveryPaymentStatusEnum.PAID) {
      throw new BadRequestException('Payment has already been completed for this delivery');
    }

    // Check delivery status allows payment
    const allowedStatuses = [
      DeliveryStatusEnum.AWAITING_PAYMENT,
      DeliveryStatusEnum.RIDER_ARRIVED_PICKUP,
      DeliveryStatusEnum.SCHEDULED,
      DeliveryStatusEnum.PENDING,
    ];
    if (!allowedStatuses.includes(delivery.status as DeliveryStatusEnum)) {
      throw new BadRequestException('Payment is not allowed at this stage');
    }

    const amount = delivery.pricing?.totalPrice;
    if (!amount || amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    if (body.paymentMethod === DeliveryPaymentMethodEnum.WALLET) {
      return this.processWalletPayment(user, delivery, amount);
    }

    // For card/bank transfer, initiate external payment
    return this.initiateExternalPayment(user, delivery, amount, body.paymentMethod);
  }

  private async processWalletPayment(user: User, delivery: any, amount: number) {
    const userId = new Types.ObjectId(user._id);

    // Get or create wallet
    const wallet = await this.paymentRepository.getOrCreateWallet(userId);

    // Check if wallet is locked
    if (wallet.isLocked) {
      throw new BadRequestException('Your wallet is temporarily locked. Please contact support.');
    }

    // Check sufficient balance
    if (wallet.depositBalance < amount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ₦${wallet.depositBalance.toLocaleString()}, Required: ₦${amount.toLocaleString()}`,
      );
    }

    // Create payment record
    const paymentReference = this.paymentRepository.generatePaymentReference();
    const payment = await this.paymentRepository.createPayment({
      reference: paymentReference,
      user: userId,
      deliveryRequest: delivery._id,
      amount,
      currency: 'NGN',
      paymentMethod: DeliveryPaymentMethodEnum.WALLET,
      status: DeliveryPaymentStatusEnum.PAID,
      provider: 'wallet',
      paidAt: new Date(),
      description: `Payment for delivery ${delivery.trackingNumber}`,
    });

    // Process wallet debit
    const { wallet: updatedWallet, transaction } =
      await this.paymentRepository.processWalletPayment(
        wallet,
        amount,
        `Delivery payment - ${delivery.trackingNumber}`,
        TransactionCategory.DELIVERY_FEE,
        { deliveryId: delivery._id.toString(), paymentId: payment._id.toString() },
      );

    // Update delivery payment status
    await this.paymentRepository.updateDeliveryPaymentStatus(
      delivery._id,
      DeliveryPaymentStatusEnum.PAID,
      payment._id,
    );

    // Emit payment completed event
    this.eventEmitter.emit('payment.completed', {
      paymentId: payment._id,
      deliveryId: delivery._id,
      userId,
      amount,
      method: 'wallet',
    });

    return {
      success: true,
      message: 'Payment completed successfully',
      data: {
        payment: {
          id: payment._id,
          reference: payment.reference,
          amount: payment.amount,
          status: payment.status,
          method: payment.paymentMethod,
          paidAt: payment.paidAt,
        },
        wallet: {
          balance: updatedWallet.depositBalance,
          currency: updatedWallet.currency,
          currencySymbol: updatedWallet.currencySymbol,
        },
        transactionRef: transaction.transactionRef,
      },
    };
  }

  private async initiateExternalPayment(
    user: User,
    delivery: any,
    amount: number,
    paymentMethod: DeliveryPaymentMethodEnum,
  ) {
    const userId = new Types.ObjectId(user._id);
    const paymentReference = this.paymentRepository.generatePaymentReference();

    // Create pending payment record
    const payment = await this.paymentRepository.createPayment({
      reference: paymentReference,
      user: userId,
      deliveryRequest: delivery._id,
      amount,
      currency: 'NGN',
      paymentMethod,
      status: DeliveryPaymentStatusEnum.PENDING,
      provider: 'paystack',
      description: `Payment for delivery ${delivery.trackingNumber}`,
    });

    // In production, integrate with Paystack/Flutterwave
    const paymentUrl = `https://checkout.paystack.com/${paymentReference}`;

    return {
      success: true,
      message: 'Payment initiated. Complete payment to proceed.',
      data: {
        payment: {
          id: payment._id,
          reference: payment.reference,
          amount: payment.amount,
          status: payment.status,
          method: payment.paymentMethod,
        },
        paymentUrl,
        provider: 'paystack',
      },
    };
  }

  async verifyPayment(user: User, body: VerifyPaymentDto) {
    const userId = new Types.ObjectId(user._id);

    // Find payment by reference
    const payment = await this.paymentRepository.findPaymentByReference(body.reference);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify ownership
    if (payment.user.toString() !== userId.toString()) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    // If already paid, return success
    if (payment.status === DeliveryPaymentStatusEnum.PAID) {
      return {
        success: true,
        message: 'Payment already verified',
        data: {
          payment: {
            id: payment._id,
            reference: payment.reference,
            amount: payment.amount,
            status: payment.status,
            paidAt: payment.paidAt,
          },
        },
      };
    }

    // In production, verify with payment provider (Paystack/Flutterwave)
    const isVerified = true;

    if (isVerified) {
      // Update payment status
      const updatedPayment = await this.paymentRepository.updatePaymentByReference(
        body.reference,
        {
          status: DeliveryPaymentStatusEnum.PAID,
          paidAt: new Date(),
          providerResponse: JSON.stringify({ verified: true }),
        },
      );

      // Update delivery payment status
      if (payment.deliveryRequest) {
        await this.paymentRepository.updateDeliveryPaymentStatus(
          payment.deliveryRequest,
          DeliveryPaymentStatusEnum.PAID,
          payment._id as Types.ObjectId,
        );
      }

      // Emit payment completed event
      this.eventEmitter.emit('payment.completed', {
        paymentId: payment._id,
        deliveryId: payment.deliveryRequest,
        userId,
        amount: payment.amount,
        method: payment.paymentMethod,
      });

      return {
        success: true,
        message: 'Payment verified successfully',
        data: {
          payment: {
            id: updatedPayment?._id,
            reference: updatedPayment?.reference,
            amount: updatedPayment?.amount,
            status: updatedPayment?.status,
            paidAt: updatedPayment?.paidAt,
          },
        },
      };
    }

    return {
      success: false,
      message: 'Payment verification failed',
      data: {
        payment: {
          id: payment._id,
          reference: payment.reference,
          status: payment.status,
        },
      },
    };
  }

  async getWalletBalance(user: User) {
    const userId = new Types.ObjectId(user._id);

    // Get or create wallet
    const wallet = await this.paymentRepository.getOrCreateWallet(userId);

    return {
      success: true,
      message: 'Wallet balance retrieved',
      data: {
        wallet: {
          id: wallet._id,
          depositBalance: wallet.depositBalance,
          withdrawableBalance: wallet.withdrawableBalance,
          totalBalance: wallet.totalBalance,
          currency: wallet.currency,
          currencySymbol: wallet.currencySymbol,
          isActive: wallet.isActive,
          isLocked: wallet.isLocked,
          totalDeposited: wallet.totalDeposited,
          totalWithdrawn: wallet.totalWithdrawn,
          lastTransactionDate: wallet.lastTransactionDate,
        },
      },
    };
  }

  async fundWallet(user: User, body: FundWalletDto) {
    const userId = new Types.ObjectId(user._id);

    // Get or create wallet
    const wallet = await this.paymentRepository.getOrCreateWallet(userId);

    if (wallet.isLocked) {
      throw new BadRequestException('Your wallet is temporarily locked. Please contact support.');
    }

    const paymentReference = this.paymentRepository.generatePaymentReference();

    // Create pending payment record for wallet funding
    const payment = await this.paymentRepository.createPayment({
      reference: paymentReference,
      user: userId,
      amount: body.amount,
      currency: 'NGN',
      paymentMethod:
        body.fundingMethod === 'card'
          ? DeliveryPaymentMethodEnum.CARD
          : DeliveryPaymentMethodEnum.BANK_TRANSFER,
      status: DeliveryPaymentStatusEnum.PENDING,
      provider: 'paystack',
      description: 'Wallet funding',
    });

    // In production, integrate with Paystack/Flutterwave
    const paymentUrl = `https://checkout.paystack.com/${paymentReference}`;

    return {
      success: true,
      message: 'Wallet funding initiated. Complete payment to add funds.',
      data: {
        payment: {
          id: payment._id,
          reference: payment.reference,
          amount: payment.amount,
          status: payment.status,
        },
        paymentUrl,
        provider: 'paystack',
      },
    };
  }

  async verifyWalletFunding(reference: string, userId: Types.ObjectId) {
    const payment = await this.paymentRepository.findPaymentByReference(reference);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.user.toString() !== userId.toString()) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    if (payment.status === DeliveryPaymentStatusEnum.PAID) {
      return {
        success: true,
        message: 'Wallet funding already completed',
        data: { payment },
      };
    }

    // Get wallet
    const wallet = await this.paymentRepository.getOrCreateWallet(userId);

    // Process wallet funding
    const { wallet: updatedWallet, transaction } =
      await this.paymentRepository.processWalletFunding(
        wallet,
        payment.amount,
        'Wallet funding via card',
        reference,
        { paymentId: payment._id?.toString() },
      );

    // Update payment status
    await this.paymentRepository.updatePaymentByReference(reference, {
      status: DeliveryPaymentStatusEnum.PAID,
      paidAt: new Date(),
    });

    return {
      success: true,
      message: 'Wallet funded successfully',
      data: {
        wallet: {
          balance: updatedWallet.depositBalance,
          currency: updatedWallet.currency,
        },
        transactionRef: transaction.transactionRef,
        amountAdded: payment.amount,
      },
    };
  }

  async withdrawFromWallet(user: User, body: WithdrawDto) {
    const userId = new Types.ObjectId(user._id);

    // Get wallet
    const wallet = await this.paymentRepository.findWalletByUser(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.isLocked) {
      throw new BadRequestException('Your wallet is temporarily locked. Please contact support.');
    }

    // Check withdrawable balance
    if (wallet.withdrawableBalance < body.amount) {
      throw new BadRequestException(
        `Insufficient withdrawable balance. Available: ₦${wallet.withdrawableBalance.toLocaleString()}`,
      );
    }

    // Create a pending withdrawal request
    const withdrawalRef = this.paymentRepository.generatePaymentReference();

    const payment = await this.paymentRepository.createPayment({
      reference: withdrawalRef,
      user: userId,
      amount: body.amount,
      currency: 'NGN',
      paymentMethod: DeliveryPaymentMethodEnum.BANK_TRANSFER,
      status: DeliveryPaymentStatusEnum.PENDING,
      provider: 'bank_transfer',
      description: 'Wallet withdrawal',
      metadata: {
        bankAccountNumber: body.bankAccountNumber,
        bankName: body.bankName,
        type: 'withdrawal',
      },
    });

    // Emit withdrawal request event
    this.eventEmitter.emit('wallet.withdrawal.requested', {
      userId,
      amount: body.amount,
      reference: withdrawalRef,
      bankDetails: {
        accountNumber: body.bankAccountNumber,
        bankName: body.bankName,
      },
    });

    return {
      success: true,
      message: 'Withdrawal request submitted. Processing may take 1-3 business days.',
      data: {
        withdrawal: {
          reference: payment.reference,
          amount: payment.amount,
          status: 'processing',
        },
      },
    };
  }

  async getWalletTransactions(user: User, filters: { page?: number; limit?: number }) {
    const userId = new Types.ObjectId(user._id);

    const { data, total } = await this.paymentRepository.findWalletTransactions(
      userId,
      filters,
    );

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    return {
      success: true,
      message: 'Wallet transactions retrieved',
      data: {
        transactions: data.map((tx) => ({
          id: tx._id,
          reference: tx.transactionRef,
          type: tx.type,
          category: tx.category,
          amount: tx.amount,
          balanceBefore: tx.totalBalanceBefore,
          balanceAfter: tx.totalBalanceAfter,
          description: tx.description,
          status: tx.status,
          createdAt: tx.createdAt,
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getPaymentById(user: User, id: string) {
    const userId = new Types.ObjectId(user._id);

    const payment = await this.paymentRepository.findPaymentById(id);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.user.toString() !== userId.toString()) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    return {
      success: true,
      message: 'Payment retrieved',
      data: {
        payment: {
          id: payment._id,
          reference: payment.reference,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
          provider: payment.provider,
          description: payment.description,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
          isRefund: payment.isRefund,
          refundedAmount: payment.refundedAmount,
          refundedAt: payment.refundedAt,
        },
      },
    };
  }

  async getPaymentHistory(user: User, filters: { page?: number; limit?: number }) {
    const userId = new Types.ObjectId(user._id);

    const { data, total } = await this.paymentRepository.findPaymentsByUser(userId, filters);

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    return {
      success: true,
      message: 'Payment history retrieved',
      data: {
        payments: data.map((payment) => ({
          id: payment._id,
          reference: payment.reference,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
          description: payment.description,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
          deliveryRequest: payment.deliveryRequest,
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    };
  }

  // Internal method for processing refunds
  async processRefund(
    userId: Types.ObjectId,
    deliveryId: Types.ObjectId,
    amount: number,
    reason: string,
  ) {
    const wallet = await this.paymentRepository.getOrCreateWallet(userId);

    const originalPayment = await this.paymentRepository.findPaymentByDelivery(deliveryId);
    if (!originalPayment) {
      throw new NotFoundException('Original payment not found');
    }

    // Process refund to wallet
    const { wallet: updatedWallet, transaction } =
      await this.paymentRepository.processRefund(
        wallet,
        amount,
        `Refund: ${reason}`,
        originalPayment.reference,
        { deliveryId: deliveryId.toString(), reason },
      );

    // Create refund payment record
    const refundPayment = await this.paymentRepository.createPayment({
      reference: this.paymentRepository.generatePaymentReference(),
      user: userId,
      deliveryRequest: deliveryId,
      amount,
      currency: 'NGN',
      paymentMethod: DeliveryPaymentMethodEnum.WALLET,
      status: DeliveryPaymentStatusEnum.PAID,
      isRefund: true,
      originalPayment: originalPayment._id as Types.ObjectId,
      refundReason: reason,
      paidAt: new Date(),
      description: `Refund for delivery`,
    });

    // Update original payment
    await this.paymentRepository.updatePayment(originalPayment._id as Types.ObjectId, {
      refundedAmount: (originalPayment.refundedAmount || 0) + amount,
      refundedAt: new Date(),
      status:
        amount >= originalPayment.amount
          ? DeliveryPaymentStatusEnum.REFUNDED
          : DeliveryPaymentStatusEnum.PARTIALLY_REFUNDED,
    });

    // Emit refund event
    this.eventEmitter.emit('payment.refunded', {
      userId,
      deliveryId,
      amount,
      reason,
      transactionRef: transaction.transactionRef,
    });

    return {
      success: true,
      refundPayment,
      transaction,
      newBalance: updatedWallet.depositBalance,
    };
  }

  // ============ Webhook Handlers (called by WebhookController) ============

  async handleWebhookPaymentSuccess(
    reference: string,
    data: { providerReference?: string; providerResponse?: string; amount: number },
  ) {
    const payment = await this.paymentRepository.findPaymentByReference(reference);
    if (!payment || payment.status === DeliveryPaymentStatusEnum.PAID) return;

    // Update payment
    await this.paymentRepository.updatePaymentByReference(reference, {
      status: DeliveryPaymentStatusEnum.PAID,
      paidAt: new Date(),
      providerReference: data.providerReference,
      providerResponse: data.providerResponse,
    });

    // If this is a wallet funding
    if (!payment.deliveryRequest && payment.description === 'Wallet funding') {
      const userId = payment.user as Types.ObjectId;
      await this.verifyWalletFunding(reference, userId);
      return;
    }

    // If this is a delivery payment, update delivery status and generate PINs
    if (payment.deliveryRequest) {
      const deliveryId = payment.deliveryRequest as Types.ObjectId;

      // Generate PINs on payment confirmation
      const pickupPin = Math.floor(1000 + Math.random() * 9000).toString();
      const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();

      await this.paymentRepository.deliveryModel.findByIdAndUpdate(deliveryId, {
        $set: {
          paymentStatus: DeliveryPaymentStatusEnum.PAID,
          payment: payment._id,
          pickupPin,
          deliveryPin,
          status: DeliveryStatusEnum.PAYMENT_CONFIRMED,
        },
      });

      this.eventEmitter.emit('payment.completed', {
        paymentId: payment._id,
        deliveryId,
        userId: payment.user,
        amount: data.amount,
        method: payment.paymentMethod,
      });
    }
  }

  async handleWebhookPaymentFailed(
    reference: string,
    data: { providerResponse?: string },
  ) {
    await this.paymentRepository.updatePaymentByReference(reference, {
      status: DeliveryPaymentStatusEnum.FAILED,
      providerResponse: data.providerResponse,
    });
  }

  async handleWebhookTransferSuccess(
    reference: string,
    data: { providerReference?: string; providerResponse?: string },
  ) {
    const payment = await this.paymentRepository.findPaymentByReference(reference);
    if (!payment) return;

    await this.paymentRepository.updatePaymentByReference(reference, {
      status: DeliveryPaymentStatusEnum.PAID,
      paidAt: new Date(),
      providerReference: data.providerReference,
      providerResponse: data.providerResponse,
    });

    // If withdrawal, debit wallet
    if (payment.metadata?.type === 'withdrawal') {
      const userId = payment.user as Types.ObjectId;
      const wallet = await this.paymentRepository.findWalletByUser(userId);
      if (wallet) {
        await this.paymentRepository.processWalletPayment(
          wallet,
          payment.amount,
          `Withdrawal to ${payment.metadata.bankName}`,
          TransactionCategory.WITHDRAWAL,
          { paymentId: payment._id?.toString() },
        );
      }
    }
  }

  async handleWebhookTransferFailed(
    reference: string,
    data: { providerResponse?: string; reason?: string },
  ) {
    await this.paymentRepository.updatePaymentByReference(reference, {
      status: DeliveryPaymentStatusEnum.FAILED,
      providerResponse: data.providerResponse,
    });

    // TODO: Notify user that withdrawal failed
    const payment = await this.paymentRepository.findPaymentByReference(reference);
    if (payment) {
      this.eventEmitter.emit('withdrawal.failed', {
        userId: payment.user,
        amount: payment.amount,
        reason: data.reason,
      });
    }
  }
}
