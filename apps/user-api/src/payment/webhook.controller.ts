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

/**
 * Webhook controller for Monnify payment notifications.
 *
 * Flow:
 * 1. User initiates payment → Monnify checkout page opens
 * 2. User pays via card/bank transfer on Monnify
 * 3. Monnify calls this webhook with payment result
 * 4. We verify signature, verify transaction with Monnify API, then complete the delivery payment
 *
 * No JWT auth — verified via Monnify HMAC-SHA512 signature.
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly monnifyService: MonnifyService,
  ) {}

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Monnify webhook for payment notifications' })
  @Post('monnify')
  @HttpCode(200)
  async handleMonnifyWebhook(
    @Body() body: { eventType: string; eventData: MonnifyWebhookPayload },
    @Headers('monnify-signature') signature: string,
  ) {
    this.logger.log(`[Monnify Webhook] Event: ${body.eventType}, Ref: ${body.eventData?.paymentReference}`);

    // 1. Verify webhook signature
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
      // 2. Verify transaction with Monnify API (double-check)
      const verification = await this.monnifyService.verifyPayment(eventData.transactionReference);
      const verifiedStatus = verification.responseBody?.paymentStatus;

      this.logger.log(
        `[Monnify Webhook] Verified status: ${verifiedStatus} for ref: ${eventData.paymentReference}`,
      );

      if (this.monnifyService.isPaymentSuccessful(verifiedStatus)) {
        // 3. Process successful payment
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
        // 4. Process failed payment
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

    // Always return 200 to Monnify so they don't retry
    return { status: 'success' };
  }
}
