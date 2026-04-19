import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { MonnifyService, MonnifyWebhookPayload } from '@libs/common/modules/monnify';
import { PaystackService, PaystackWebhookPayload } from '@libs/common/modules/paystack';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly monnifyService: MonnifyService,
    private readonly paystackService: PaystackService,
  ) {}

  // ═══════════════════════════════════════
  //  PAYSTACK WEBHOOK
  // ═══════════════════════════════════════

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Paystack webhook for payment notifications' })
  @Post('paystack')
  @HttpCode(200)
  async handlePaystackWebhook(
    @Body() body: PaystackWebhookPayload,
    @Headers('x-paystack-signature') signature: string,
  ) {
    this.logger.log(`[Paystack Webhook] Event: ${body.event}, Ref: ${body.data?.reference}`);

    // 1. Verify webhook signature
    if (!signature || !this.paystackService.verifyWebhookSignature(body, signature)) {
      this.logger.warn('[Paystack Webhook] Invalid signature — rejecting');
      return { status: 'error', message: 'Invalid signature' };
    }

    const { event, data } = body;

    if (!data || !data.reference) {
      this.logger.warn('[Paystack Webhook] Missing event data');
      return { status: 'error', message: 'Missing event data' };
    }

    try {
      if (event === 'charge.success') {
        // Double-verify with Paystack API
        const verification = await this.paystackService.verifyPayment(data.reference);
        const verifiedStatus = verification.data?.status;

        this.logger.log(
          `[Paystack Webhook] Verified status: ${verifiedStatus} for ref: ${data.reference}`,
        );

        if (this.paystackService.isPaymentSuccessful(verifiedStatus)) {
          await this.paymentService.handleWebhookPaymentSuccess(
            data.reference,
            {
              providerReference: verification.data?.reference,
              providerResponse: JSON.stringify(verification.data),
              amount: verification.data?.amount / 100, // kobo → naira
            },
          );
          this.logger.log(`[Paystack Webhook] Payment completed: ${data.reference}`);
        } else if (this.paystackService.isPaymentFailed(verifiedStatus)) {
          await this.paymentService.handleWebhookPaymentFailed(
            data.reference,
            {
              providerResponse: JSON.stringify(verification.data),
            },
          );
          this.logger.log(`[Paystack Webhook] Payment failed: ${data.reference}`);
        }
      }
    } catch (error) {
      this.logger.error(`[Paystack Webhook] Error processing: ${error.message}`, error.stack);
    }

    return { status: 'success' };
  }

  // ═══════════════════════════════════════
  //  MONNIFY WEBHOOK (legacy — kept for in-flight payments)
  // ═══════════════════════════════════════

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Monnify webhook for payment notifications' })
  @Post('monnify')
  @HttpCode(200)
  async handleMonnifyWebhook(
    @Body() body: { eventType: string; eventData: MonnifyWebhookPayload },
    @Headers('monnify-signature') signature: string,
  ) {
    this.logger.log(`[Monnify Webhook] Event: ${body.eventType}, Ref: ${body.eventData?.paymentReference}`);

    if (!signature || !this.monnifyService.verifyWebhookSignature(body, signature)) {
      this.logger.warn('[Monnify Webhook] Invalid signature — rejecting');
      return { status: 'error', message: 'Invalid signature' };
    }

    const eventData = body.eventData;

    if (!eventData || !eventData.paymentReference) {
      this.logger.warn('[Monnify Webhook] Missing event data');
      return { status: 'error', message: 'Missing event data' };
    }

    try {
      const verification = await this.monnifyService.verifyPayment(eventData.transactionReference);
      const verifiedStatus = verification.responseBody?.paymentStatus;

      this.logger.log(
        `[Monnify Webhook] Verified status: ${verifiedStatus} for ref: ${eventData.paymentReference}`,
      );

      if (this.monnifyService.isPaymentSuccessful(verifiedStatus)) {
        await this.paymentService.handleWebhookPaymentSuccess(
          eventData.paymentReference,
          {
            providerReference: eventData.transactionReference,
            providerResponse: JSON.stringify(verification.responseBody),
            amount: verification.responseBody.amountPaid,
          },
        );

        this.logger.log(`[Monnify Webhook] Payment completed: ${eventData.paymentReference}`);
      } else if (this.monnifyService.isPaymentFailed(verifiedStatus)) {
        await this.paymentService.handleWebhookPaymentFailed(
          eventData.paymentReference,
          {
            providerResponse: JSON.stringify(verification.responseBody),
          },
        );

        this.logger.log(`[Monnify Webhook] Payment failed: ${eventData.paymentReference}`);
      } else {
        this.logger.log(`[Monnify Webhook] Payment still pending: ${verifiedStatus}`);
      }
    } catch (error) {
      this.logger.error(`[Monnify Webhook] Error processing: ${error.message}`, error.stack);
    }

    return { status: 'success' };
  }
}
