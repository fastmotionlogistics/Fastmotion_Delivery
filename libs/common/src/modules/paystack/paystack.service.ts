import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface PaystackInitPaymentDto {
  amount: number;
  email: string;
  reference: string;
  currency?: string;
  channels?: string[];
  metadata?: Record<string, any>;
  callbackUrl?: string;
}

export interface PaystackInitPaymentResult {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResult {
  status: boolean;
  message: string;
  data: {
    id: number;
    reference: string;
    amount: number;
    currency: string;
    status: string; // 'success' | 'failed' | 'abandoned'
    gateway_response: string;
    paid_at: string | null;
    created_at: string;
    channel: string;
    fees: number;
    customer: {
      id: number;
      email: string;
      first_name: string | null;
      last_name: string | null;
      customer_code: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
    };
    metadata: Record<string, any>;
  };
}

export interface PaystackWebhookPayload {
  event: string;
  data: {
    id: number;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    gateway_response: string;
    paid_at: string | null;
    channel: string;
    fees: number;
    customer: {
      id: number;
      email: string;
      first_name: string | null;
      last_name: string | null;
      customer_code: string;
    };
    metadata: Record<string, any>;
  };
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.secretKey = this.configService.getOrThrow('PAYSTACK_SECRET_KEY');
    this.publicKey = this.configService.getOrThrow('PAYSTACK_PUBLIC_KEY');
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  // ═══════════════════════════════════════
  //  INITIALIZE TRANSACTION
  // ═══════════════════════════════════════

  async initializePayment(dto: PaystackInitPaymentDto): Promise<PaystackInitPaymentResult> {
    const payload = {
      email: dto.email,
      amount: Math.round(dto.amount * 100), // Paystack expects kobo (subunit)
      reference: dto.reference,
      currency: dto.currency || 'NGN',
      channels: dto.channels || ['card', 'bank_transfer'],
      metadata: dto.metadata || {},
      ...(dto.callbackUrl && { callback_url: dto.callbackUrl }),
    };

    try {
      const response = await this.httpService.axiosRef.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data as PaystackInitPaymentResult;
    } catch (error) {
      this.logger.error('Paystack init payment failed:', error?.response?.data || error.message);
      throw new BadRequestException(
        error?.response?.data?.message || 'Payment initialization failed',
      );
    }
  }

  // ═══════════════════════════════════════
  //  VERIFY TRANSACTION
  // ═══════════════════════════════════════

  async verifyPayment(reference: string): Promise<PaystackVerifyResult> {
    const encodedRef = encodeURIComponent(reference);

    try {
      const response = await this.httpService.axiosRef.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${encodedRef}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      return response.data as PaystackVerifyResult;
    } catch (error) {
      this.logger.error('Paystack verify failed:', error?.response?.data || error.message);
      throw new BadRequestException('Payment verification failed');
    }
  }

  // ═══════════════════════════════════════
  //  WEBHOOK SIGNATURE VERIFICATION
  // ═══════════════════════════════════════

  verifyWebhookSignature(body: any, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(JSON.stringify(body))
      .digest('hex');

    return hash === signature;
  }

  // ═══════════════════════════════════════
  //  STATUS HELPERS
  // ═══════════════════════════════════════

  isPaymentSuccessful(status: string): boolean {
    return status?.toLowerCase() === 'success';
  }

  isPaymentFailed(status: string): boolean {
    return ['failed', 'abandoned'].includes(status?.toLowerCase());
  }

  isPaymentPending(status: string): boolean {
    return !this.isPaymentSuccessful(status) && !this.isPaymentFailed(status);
  }
}
