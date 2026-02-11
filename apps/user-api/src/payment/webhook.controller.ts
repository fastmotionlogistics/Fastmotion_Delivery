import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Webhook controller for payment provider callbacks (Paystack/Flutterwave)
 * PRD Section 9: Supported payment methods - Wallet, Card, Bank transfer
 *
 * These endpoints are called by payment providers to confirm transactions.
 * No JWT auth — verified via provider-specific signatures.
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Paystack webhook handler' })
  @Post('paystack')
  @HttpCode(200)
  async handlePaystackWebhook(
    @Body() body: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    // Verify webhook signature
    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (secret) {
      const hash = crypto
        .createHmac('sha512', secret)
        .update(JSON.stringify(body))
        .digest('hex');

      if (hash !== signature) {
        return { status: 'error', message: 'Invalid signature' };
      }
    }

    const event = body.event;
    const data = body.data;

    switch (event) {
      case 'charge.success':
        // Payment was successful
        await this.handleSuccessfulPayment(data);
        break;

      case 'transfer.success':
        // Withdrawal/transfer completed
        await this.handleSuccessfulTransfer(data);
        break;

      case 'transfer.failed':
        // Withdrawal/transfer failed
        await this.handleFailedTransfer(data);
        break;

      case 'charge.failed':
        // Payment failed
        await this.handleFailedPayment(data);
        break;

      default:
        // Log unhandled events
        console.log(`[Webhook] Unhandled Paystack event: ${event}`);
    }

    return { status: 'success' };
  }

  private async handleSuccessfulPayment(data: any) {
    try {
      const reference = data.reference;
      const amount = data.amount / 100; // Paystack sends amount in kobo

      // Verify and complete the payment
      // The paymentService.verifyPayment already handles status updates
      // This is called with a system-level user context
      console.log(`[Webhook] Payment success: ${reference}, Amount: ${amount}`);

      // Direct DB update via payment service internal method
      await this.paymentService.handleWebhookPaymentSuccess(reference, {
        providerReference: data.id?.toString(),
        providerResponse: JSON.stringify(data),
        amount,
      });
    } catch (error) {
      console.error(`[Webhook] Error processing payment success:`, error);
    }
  }

  private async handleFailedPayment(data: any) {
    try {
      const reference = data.reference;
      console.log(`[Webhook] Payment failed: ${reference}`);

      await this.paymentService.handleWebhookPaymentFailed(reference, {
        providerResponse: JSON.stringify(data),
      });
    } catch (error) {
      console.error(`[Webhook] Error processing payment failure:`, error);
    }
  }

  private async handleSuccessfulTransfer(data: any) {
    try {
      const reference = data.reference;
      console.log(`[Webhook] Transfer success: ${reference}`);

      await this.paymentService.handleWebhookTransferSuccess(reference, {
        providerReference: data.transfer_code,
        providerResponse: JSON.stringify(data),
      });
    } catch (error) {
      console.error(`[Webhook] Error processing transfer success:`, error);
    }
  }

  private async handleFailedTransfer(data: any) {
    try {
      const reference = data.reference;
      console.log(`[Webhook] Transfer failed: ${reference}`);

      await this.paymentService.handleWebhookTransferFailed(reference, {
        providerResponse: JSON.stringify(data),
        reason: data.reason || 'Transfer failed',
      });
    } catch (error) {
      console.error(`[Webhook] Error processing transfer failure:`, error);
    }
  }
}
