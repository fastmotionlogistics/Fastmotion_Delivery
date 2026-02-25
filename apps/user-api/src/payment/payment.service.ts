import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
import { User } from '@libs/database';
import {
  DeliveryPaymentStatusEnum,
  DeliveryPaymentMethodEnum,
  DeliveryStatusEnum,
  TransactionType,
  TransactionStatus,
} from '@libs/common';
import { PaymentRepository } from './repository';
import { InitiatePaymentDto, FundWalletDto, VerifyPaymentDto, WithdrawDto } from './dto';
import { TransactionCategory } from '@libs/database/schemas/walletTransaction.schema';
import { MonnifyService } from '@libs/common/modules/monnify';
import { DeliveryGateway } from '@libs/common/modules/gateway';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly monnifyService: MonnifyService,
    private readonly gateway: DeliveryGateway,
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
      DeliveryStatusEnum.SEARCHING_RIDER,
      DeliveryStatusEnum.RIDER_ACCEPTED,
      DeliveryStatusEnum.RIDER_ASSIGNED,
      DeliveryStatusEnum.RIDER_EN_ROUTE_PICKUP,
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

    // For card/bank transfer, initiate Monnify payment
    return this.initiateMonnifyPayment(user, delivery, amount, body.paymentMethod);
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

    // Generate PINs and update delivery
    const pickupPin = Math.floor(1000 + Math.random() * 9000).toString();
    const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();

    // Determine the correct next status
    const isQuickDelivery = delivery.deliveryType === 'quick';
    const newStatus = isQuickDelivery
      ? DeliveryStatusEnum.PAYMENT_CONFIRMED
      : DeliveryStatusEnum.SCHEDULED;

    await this.paymentRepository.deliveryModel.findByIdAndUpdate(delivery._id, {
      $set: {
        paymentStatus: DeliveryPaymentStatusEnum.PAID,
        payment: payment._id,
        pickupPin,
        deliveryPin,
        status: newStatus,
      },
    });

    // WS: broadcast payment confirmed
    this.gateway.emitDeliveryStatusUpdate(
      delivery._id.toString(),
      newStatus,
      { paymentStatus: 'paid' },
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
          status: DeliveryPaymentStatusEnum.PAID,
          method: payment.paymentMethod,
          paidAt: payment.paidAt,
        },
        wallet: {
          balance: updatedWallet.depositBalance,
          currency: updatedWallet.currency,
          currencySymbol: updatedWallet.currencySymbol,
        },
        delivery: {
          status: newStatus,
          pickupPin,
          deliveryPin,
        },
        transactionRef: transaction.transactionRef,
      },
    };
  }

  private async initiateMonnifyPayment(
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
      provider: 'monnify',
      description: `Payment for delivery ${delivery.trackingNumber}`,
    });

    // Map our payment method to Monnify's
    const monnifyMethods =
      paymentMethod === DeliveryPaymentMethodEnum.CARD
        ? ['CARD']
        : paymentMethod === DeliveryPaymentMethodEnum.BANK_TRANSFER
          ? ['ACCOUNT_TRANSFER']
          : ['CARD', 'ACCOUNT_TRANSFER'];

    // Initialize Monnify transaction
    const monnifyResult = await this.monnifyService.initializePayment({
      amount,
      customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer',
      customerEmail: user.email,
      paymentReference,
      paymentDescription: `FastMotion delivery ${delivery.trackingNumber}`,
      paymentMethods: monnifyMethods,
      metaData: {
        deliveryId: delivery._id.toString(),
        userId: userId.toString(),
        trackingNumber: delivery.trackingNumber,
        deliveryType: delivery.deliveryType,
      },
    });

    // Save the Monnify transaction reference
    await this.paymentRepository.updatePaymentByReference(paymentReference, {
      providerReference: monnifyResult.responseBody?.transactionReference,
    });

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
        checkoutUrl: monnifyResult.responseBody?.checkoutUrl,
        transactionReference: monnifyResult.responseBody?.transactionReference,
        provider: 'monnify',
      },
    };
  }

  // ── Payment status polling (for mobile app to check after card/bank payment) ──

  async getPaymentStatus(user: User, reference: string) {
    const userId = new Types.ObjectId(user._id);

    const payment = await this.paymentRepository.findPaymentByReference(reference);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.user.toString() !== userId.toString()) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    // If still pending and has a Monnify reference, verify with Monnify
    if (
      payment.status === DeliveryPaymentStatusEnum.PENDING &&
      payment.providerReference
    ) {
      try {
        const verification = await this.monnifyService.verifyPayment(payment.providerReference);
        const verifiedStatus = verification.responseBody?.paymentStatus;

        if (this.monnifyService.isPaymentSuccessful(verifiedStatus)) {
          // Process the payment (generates PINs for delivery, or credits wallet)
          await this.handleWebhookPaymentSuccess(reference, {
            providerReference: payment.providerReference,
            providerResponse: JSON.stringify(verification.responseBody),
            amount: verification.responseBody.amountPaid,
          });

          const updatedPayment = await this.paymentRepository.findPaymentByReference(reference);

          // Wallet funding — no delivery to look up
          const isWalletFunding = !payment.deliveryRequest && payment.description === 'Wallet funding';
          if (isWalletFunding) {
            const { depositBalance } = await this.computeWalletBalance(
              payment.user as Types.ObjectId,
            );
            return {
              success: true,
              message: 'Wallet funded successfully',
              data: {
                status: DeliveryPaymentStatusEnum.PAID,
                paidAt: updatedPayment?.paidAt,
                walletBalance: depositBalance,
              },
            };
          }

          // Delivery payment — fetch delivery with PINs
          let deliveryData: any = {};
          if (payment.deliveryRequest) {
            const delivery = await this.paymentRepository.deliveryModel
              .findById(payment.deliveryRequest)
              .select('+pickupPin +deliveryPin')
              .lean();
            if (delivery) {
              deliveryData = {
                deliveryId: delivery._id,
                pickupPin: delivery.pickupPin,
                deliveryPin: delivery.deliveryPin,
                deliveryStatus: delivery.status,
              };
            }
          }

          return {
            success: true,
            message: 'Payment confirmed',
            data: {
              status: DeliveryPaymentStatusEnum.PAID,
              paidAt: updatedPayment?.paidAt,
              ...deliveryData,
            },
          };
        } else if (this.monnifyService.isPaymentFailed(verifiedStatus)) {
          await this.handleWebhookPaymentFailed(reference, {
            providerResponse: JSON.stringify(verification.responseBody),
          });

          return {
            success: true,
            message: 'Payment failed',
            data: {
              status: DeliveryPaymentStatusEnum.FAILED,
            },
          };
        }
      } catch (error) {
        this.logger.warn(`Payment verification check failed for ${reference}: ${error.message}`);
      }
    }

    // If already paid, return PINs from the delivery
    if (payment.status === DeliveryPaymentStatusEnum.PAID && payment.deliveryRequest) {
      const delivery = await this.paymentRepository.deliveryModel
        .findById(payment.deliveryRequest)
        .select('+pickupPin +deliveryPin')
        .lean();

      return {
        success: true,
        message: 'Payment status retrieved',
        data: {
          status: payment.status,
          paidAt: payment.paidAt,
          pickupPin: delivery?.pickupPin,
          deliveryPin: delivery?.deliveryPin,
          deliveryStatus: delivery?.status,
        },
      };
    }

    return {
      success: true,
      message: 'Payment status retrieved',
      data: {
        status: payment.status,
        paidAt: payment.paidAt,
      },
    };
  }

  async verifyPayment(user: User, body: VerifyPaymentDto) {
    // Delegate to getPaymentStatus which also does Monnify verification
    return this.getPaymentStatus(user, body.reference);
  }

  private async computeWalletBalance(userId: Types.ObjectId): Promise<{ depositBalance: number; totalCredits: number; totalDebits: number }> {
    // TransactionType enum uses numeric values (CREDIT=2, DEBIT=1) but schema
    // stores them as String, so compare against both string and number forms
    const creditVal = TransactionType.CREDIT; // 2
    const debitVal = TransactionType.DEBIT;   // 1

    const balances = await this.paymentRepository.walletTransactionModel.aggregate([
      {
        $match: {
          user: userId,
          status: { $in: [TransactionStatus.COMPLETED, 'COMPLETED'] },
        },
      },
      {
        $group: {
          _id: null,
          totalCredits: {
            $sum: {
              $cond: [
                { $in: ['$type', [creditVal, String(creditVal), 'CREDIT']] },
                '$amount',
                0,
              ],
            },
          },
          totalDebits: {
            $sum: {
              $cond: [
                { $in: ['$type', [debitVal, String(debitVal), 'DEBIT']] },
                '$amount',
                0,
              ],
            },
          },
        },
      },
    ]);

    const totalCredits = balances[0]?.totalCredits || 0;
    const totalDebits = balances[0]?.totalDebits || 0;
    return { depositBalance: totalCredits - totalDebits, totalCredits, totalDebits };
  }

  async getWalletBalance(user: User) {
    const userId = new Types.ObjectId(user._id);
    const wallet = await this.paymentRepository.getOrCreateWallet(userId);

    // Compute balance as aggregate of all completed wallet transactions
    const { depositBalance, totalCredits, totalDebits } = await this.computeWalletBalance(userId);

    // Sync wallet document if out of date
    if (wallet.depositBalance !== depositBalance) {
      await this.paymentRepository.walletModel.findByIdAndUpdate(wallet._id, {
        $set: {
          depositBalance,
          totalBalance: depositBalance + (wallet.withdrawableBalance || 0),
          totalDeposited: totalCredits,
          totalWithdrawn: totalDebits,
        },
      });
    }

    return {
      success: true,
      message: 'Wallet balance retrieved',
      data: {
        wallet: {
          id: wallet._id,
          depositBalance,
          withdrawableBalance: wallet.withdrawableBalance,
          totalBalance: depositBalance + (wallet.withdrawableBalance || 0),
          currency: wallet.currency,
          currencySymbol: wallet.currencySymbol,
          isActive: wallet.isActive,
          isLocked: wallet.isLocked,
          totalDeposited: totalCredits,
          totalWithdrawn: totalDebits,
          lastTransactionDate: wallet.lastTransactionDate,
        },
      },
    };
  }

  async fundWallet(user: User, body: FundWalletDto) {
    const userId = new Types.ObjectId(user._id);
    const wallet = await this.paymentRepository.getOrCreateWallet(userId);

    if (wallet.isLocked) {
      throw new BadRequestException('Your wallet is temporarily locked. Please contact support.');
    }

    const paymentReference = this.paymentRepository.generatePaymentReference();

    // Create pending payment record
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
      provider: 'monnify',
      description: 'Wallet funding',
    });

    const monnifyMethods =
      body.fundingMethod === 'card' ? ['CARD'] : ['ACCOUNT_TRANSFER'];

    // Initialize Monnify
    const monnifyResult = await this.monnifyService.initializePayment({
      amount: body.amount,
      customerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer',
      customerEmail: user.email,
      paymentReference,
      paymentDescription: 'FastMotion wallet funding',
      paymentMethods: monnifyMethods,
      metaData: {
        userId: userId.toString(),
        type: 'wallet_funding',
      },
    });

    // Save Monnify transaction reference
    await this.paymentRepository.updatePaymentByReference(paymentReference, {
      providerReference: monnifyResult.responseBody?.transactionReference,
    });

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
        checkoutUrl: monnifyResult.responseBody?.checkoutUrl,
        transactionReference: monnifyResult.responseBody?.transactionReference,
        provider: 'monnify',
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

    // Check if a wallet transaction already exists for this payment reference
    // to avoid double-crediting the wallet
    const existingTx = await this.paymentRepository.walletTransactionModel
      .findOne({ reference }).lean();
    if (existingTx) {
      const wallet = await this.paymentRepository.getOrCreateWallet(userId);
      return {
        success: true,
        message: 'Wallet funding already completed',
        data: {
          wallet: { balance: wallet.depositBalance, currency: wallet.currency },
          transactionRef: existingTx.transactionRef,
          amountAdded: payment.amount,
        },
      };
    }

    const wallet = await this.paymentRepository.getOrCreateWallet(userId);

    const { wallet: updatedWallet, transaction } =
      await this.paymentRepository.processWalletFunding(
        wallet,
        payment.amount,
        'Wallet funding via Monnify',
        reference,
        { paymentId: payment._id?.toString() },
      );

    // Ensure payment is marked as paid
    if (payment.status !== DeliveryPaymentStatusEnum.PAID) {
      await this.paymentRepository.updatePaymentByReference(reference, {
        status: DeliveryPaymentStatusEnum.PAID,
        paidAt: new Date(),
      });
    }

    return {
      success: true,
      message: 'Wallet funded successfully',
      data: {
        wallet: { balance: updatedWallet.depositBalance, currency: updatedWallet.currency },
        transactionRef: transaction.transactionRef,
        amountAdded: payment.amount,
      },
    };
  }

  async withdrawFromWallet(user: User, body: WithdrawDto) {
    const userId = new Types.ObjectId(user._id);
    const wallet = await this.paymentRepository.findWalletByUser(userId);
    if (!wallet) throw new NotFoundException('Wallet not found');

    if (wallet.isLocked) {
      throw new BadRequestException('Your wallet is temporarily locked. Please contact support.');
    }

    if (wallet.withdrawableBalance < body.amount) {
      throw new BadRequestException(
        `Insufficient withdrawable balance. Available: ₦${wallet.withdrawableBalance.toLocaleString()}`,
      );
    }

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

    this.eventEmitter.emit('wallet.withdrawal.requested', {
      userId,
      amount: body.amount,
      reference: withdrawalRef,
      bankDetails: { accountNumber: body.bankAccountNumber, bankName: body.bankName },
    });

    return {
      success: true,
      message: 'Withdrawal request submitted. Processing may take 1-3 business days.',
      data: {
        withdrawal: { reference: payment.reference, amount: payment.amount, status: 'processing' },
      },
    };
  }

  async getWalletTransactions(user: User, filters: { page?: number; limit?: number }) {
    const userId = new Types.ObjectId(user._id);
    const { data, total } = await this.paymentRepository.findWalletTransactions(userId, filters);
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
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    };
  }

  async getPaymentById(user: User, id: string) {
    const userId = new Types.ObjectId(user._id);
    const payment = await this.paymentRepository.findPaymentById(id);
    if (!payment) throw new NotFoundException('Payment not found');

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
        payments: data.map((p) => ({
          id: p._id,
          reference: p.reference,
          amount: p.amount,
          currency: p.currency,
          paymentMethod: p.paymentMethod,
          status: p.status,
          description: p.description,
          paidAt: p.paidAt,
          createdAt: p.createdAt,
          deliveryRequest: p.deliveryRequest,
        })),
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
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
    if (!originalPayment) throw new NotFoundException('Original payment not found');

    const { wallet: updatedWallet, transaction } =
      await this.paymentRepository.processRefund(
        wallet, amount, `Refund: ${reason}`, originalPayment.reference,
        { deliveryId: deliveryId.toString(), reason },
      );

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

    await this.paymentRepository.updatePayment(originalPayment._id as Types.ObjectId, {
      refundedAmount: (originalPayment.refundedAmount || 0) + amount,
      refundedAt: new Date(),
      status: amount >= originalPayment.amount
        ? DeliveryPaymentStatusEnum.REFUNDED
        : DeliveryPaymentStatusEnum.PARTIALLY_REFUNDED,
    });

    this.eventEmitter.emit('payment.refunded', {
      userId, deliveryId, amount, reason,
      transactionRef: transaction.transactionRef,
    });

    return { success: true, refundPayment, transaction, newBalance: updatedWallet.depositBalance };
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

    // If this is a wallet funding — credit wallet directly
    if (!payment.deliveryRequest && payment.description === 'Wallet funding') {
      const userId = payment.user as Types.ObjectId;

      // Guard against double-credit (webhook + polling race)
      const existingTx = await this.paymentRepository.walletTransactionModel
        .findOne({ reference }).lean();
      if (existingTx) {
        this.logger.log(`Wallet funding already processed for ref ${reference}, skipping`);
        return;
      }

      const wallet = await this.paymentRepository.getOrCreateWallet(userId);

      await this.paymentRepository.processWalletFunding(
        wallet,
        payment.amount,
        'Wallet funding via Monnify',
        reference,
        { paymentId: payment._id?.toString() },
      );

      this.logger.log(`Wallet funded for user ${userId}: ₦${payment.amount} via ref ${reference}`);
      return;
    }

    // If this is a delivery payment, update delivery status and generate PINs
    if (payment.deliveryRequest) {
      const deliveryId = payment.deliveryRequest as Types.ObjectId;
      const delivery = await this.paymentRepository.findDeliveryById(deliveryId);

      const pickupPin = Math.floor(1000 + Math.random() * 9000).toString();
      const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();

      // Determine next status based on delivery type and current status
      let newStatus = DeliveryStatusEnum.PAYMENT_CONFIRMED;
      if (delivery?.deliveryType === 'scheduled') {
        newStatus = DeliveryStatusEnum.SCHEDULED;
      }

      await this.paymentRepository.deliveryModel.findByIdAndUpdate(deliveryId, {
        $set: {
          paymentStatus: DeliveryPaymentStatusEnum.PAID,
          payment: payment._id,
          pickupPin,
          deliveryPin,
          status: newStatus,
        },
      });

      // WS: broadcast payment confirmed to the user's app
      this.gateway.emitDeliveryStatusUpdate(
        deliveryId.toString(),
        newStatus,
        { paymentStatus: 'paid' },
      );

      this.eventEmitter.emit('payment.completed', {
        paymentId: payment._id,
        deliveryId,
        userId: payment.user,
        amount: data.amount,
        method: payment.paymentMethod,
      });

      this.logger.log(
        `Delivery ${deliveryId} payment confirmed via webhook → status: ${newStatus}`,
      );
    }
  }

  async handleWebhookPaymentFailed(
    reference: string,
    data: { providerResponse?: string },
  ) {
    const payment = await this.paymentRepository.findPaymentByReference(reference);
    if (!payment) return;

    await this.paymentRepository.updatePaymentByReference(reference, {
      status: DeliveryPaymentStatusEnum.FAILED,
      providerResponse: data.providerResponse,
    });

    // If delivery payment failed, revert delivery status
    if (payment.deliveryRequest) {
      const deliveryId = payment.deliveryRequest as Types.ObjectId;
      const delivery = await this.paymentRepository.findDeliveryById(deliveryId);

      if (delivery?.status === DeliveryStatusEnum.AWAITING_PAYMENT) {
        // Revert to previous status
        const revertStatus = delivery.deliveryType === 'quick'
          ? DeliveryStatusEnum.RIDER_ARRIVED_PICKUP
          : DeliveryStatusEnum.PENDING;

        await this.paymentRepository.deliveryModel.findByIdAndUpdate(deliveryId, {
          $set: { paymentStatus: DeliveryPaymentStatusEnum.FAILED, status: revertStatus },
        });

        this.gateway.emitDeliveryStatusUpdate(
          deliveryId.toString(),
          revertStatus,
          { paymentStatus: 'failed' },
        );
      }
    }
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

    if (payment.metadata?.type === 'withdrawal') {
      const userId = payment.user as Types.ObjectId;
      const wallet = await this.paymentRepository.findWalletByUser(userId);
      if (wallet) {
        await this.paymentRepository.processWalletPayment(
          wallet, payment.amount,
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

    const payment = await this.paymentRepository.findPaymentByReference(reference);
    if (payment) {
      this.eventEmitter.emit('withdrawal.failed', {
        userId: payment.user, amount: payment.amount, reason: data.reason,
      });
    }
  }
}
