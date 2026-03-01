import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// ── Monnify Constants ────────────────────────────────────
const MONNIFY_URLS = {
  BASE_LIVE: 'https://api.monnify.com',
  BASE_SANDBOX: 'https://sandbox.monnify.com',
  AUTH: '/api/v1/auth/login',
  INIT_PAYMENT: '/api/v1/merchant/transactions/init-transaction',
  VERIFY_PAYMENT: '/api/v2/transactions/',
};

// ── Interfaces ───────────────────────────────────────────
export interface MonnifyInitPaymentDto {
  amount: number;
  customerName: string;
  customerEmail: string;
  paymentReference: string;
  paymentDescription: string;
  currencyCode?: string;
  contractCode?: string;
  redirectUrl?: string;
  paymentMethods?: string[];
  metaData?: Record<string, any>;
}

export interface MonnifyInitPaymentResult {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode: string;
  responseBody: {
    transactionReference: string;
    paymentReference: string;
    merchantName: string;
    apiKey: string;
    enabledPaymentMethod: string[];
    checkoutUrl: string;
    amount: number;
  };
}

export interface MonnifyVerifyResult {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode: string;
  responseBody: {
    transactionReference: string;
    paymentReference: string;
    amountPaid: number;
    totalPayable: number;
    paymentStatus: string; // PAID, PENDING, OVERPAID, PARTIALLY_PAID, FAILED, etc.
    paymentDescription: string;
    paymentMethod: string;
    currency: string;
    paidOn: string;
    metaData: Record<string, any>;
    product: any;
    customer: any;
  };
}

export interface MonnifyWebhookPayload {
  transactionReference: string;
  paymentReference: string;
  amountPaid: number;
  totalPayable: number;
  paidOn: string;
  paymentStatus: string;
  paymentDescription: string;
  transactionHash: string;
  currency: string;
  paymentMethod: string;
  product: any;
  cardDetails: any;
  accountDetails: any;
  accountPayments: any[];
  customer: any;
  metaData: Record<string, any>;
}

@Injectable()
export class MonnifyService {
  private readonly logger = new Logger(MonnifyService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly contractCode: string;

  // Token cache
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.getOrThrow('MONNIFY_WALLET_API_KEY');
    this.secretKey = this.configService.getOrThrow('MONNIFY_WALLET_SECRET_KEY');
    this.contractCode = this.configService.getOrThrow('MONNIFY_WALLET_CONTRACT_CODE');

    // Use sandbox for test keys, live for live keys
    this.baseUrl = this.apiKey.startsWith('MK_TEST')
      ? MONNIFY_URLS.BASE_SANDBOX
      : MONNIFY_URLS.BASE_LIVE;
  }

  // ═══════════════════════════════════════════
  //  AUTH
  // ═══════════════════════════════════════════

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.cachedToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedToken;
    }

    const credentials = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64');

    try {
      const response = await this.httpService.axiosRef.post(
        `${this.baseUrl}${MONNIFY_URLS.AUTH}`,
        {},
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        },
      );

      const body = response.data?.responseBody;
      this.cachedToken = body.accessToken;
      // Monnify tokens last ~5 mins, cache for 4 mins
      this.tokenExpiresAt = Date.now() + 4 * 60 * 1000;

      return this.cachedToken;
    } catch (error) {
      this.logger.error('Monnify auth failed:', error?.response?.data || error.message);
      throw new BadRequestException('Payment service authentication failed');
    }
  }

  // ═══════════════════════════════════════════
  //  INITIALIZE PAYMENT
  // ═══════════════════════════════════════════

  async initializePayment(dto: MonnifyInitPaymentDto): Promise<MonnifyInitPaymentResult> {
    const token = await this.getAccessToken();

    const payload = {
      amount: dto.amount,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      paymentReference: dto.paymentReference,
      paymentDescription: dto.paymentDescription,
      currencyCode: dto.currencyCode || 'NGN',
      contractCode: dto.contractCode || this.contractCode,
      redirectUrl: dto.redirectUrl || '',
      paymentMethods: dto.paymentMethods || ['CARD', 'ACCOUNT_TRANSFER'],
      metaData: dto.metaData || {},
    };

    try {
      const response = await this.httpService.axiosRef.post(
        `${this.baseUrl}${MONNIFY_URLS.INIT_PAYMENT}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data as MonnifyInitPaymentResult;
    } catch (error) {
      this.logger.error('Monnify init payment failed:', error?.response?.data || error.message);
      throw new BadRequestException(
        error?.response?.data?.responseMessage || 'Payment initialization failed',
      );
    }
  }

  // ═══════════════════════════════════════════
  //  VERIFY PAYMENT
  // ═══════════════════════════════════════════

  async verifyPayment(transactionReference: string): Promise<MonnifyVerifyResult> {
    const token = await this.getAccessToken();
    const encodedRef = encodeURIComponent(transactionReference);

    try {
      const response = await this.httpService.axiosRef.get(
        `${this.baseUrl}${MONNIFY_URLS.VERIFY_PAYMENT}${encodedRef}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return response.data as MonnifyVerifyResult;
    } catch (error) {
      this.logger.error('Monnify verify failed:', error?.response?.data || error.message);
      throw new BadRequestException('Payment verification failed');
    }
  }

  // ═══════════════════════════════════════════
  //  WEBHOOK SIGNATURE VERIFICATION
  // ═══════════════════════════════════════════

  verifyWebhookSignature(payload: any, signature: string): boolean {
    const computedHash = crypto
      .createHmac('sha512', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    return computedHash === signature;
  }

  // ═══════════════════════════════════════════
  //  GET BANK LIST
  // ═══════════════════════════════════════════

  async getBankList(): Promise<{ name: string; code: string }[]> {
    const token = await this.getAccessToken();

    try {
      const response = await this.httpService.axiosRef.get(
        `${this.baseUrl}/api/v1/banks`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const banks = response.data?.responseBody || [];
      return banks.map((b: any) => ({ name: b.name, code: b.code }));
    } catch (error) {
      this.logger.error('Monnify get banks failed:', error?.response?.data || error.message);
      throw new BadRequestException('Failed to fetch bank list');
    }
  }

  // ═══════════════════════════════════════════
  //  VALIDATE BANK ACCOUNT
  // ═══════════════════════════════════════════

  async validateBankAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountNumber: string; accountName: string; bankCode: string }> {
    const token = await this.getAccessToken();

    try {
      const response = await this.httpService.axiosRef.get(
        `${this.baseUrl}/api/v1/disbursements/account/validate`,
        {
          params: { accountNumber, bankCode },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const body = response.data?.responseBody;
      if (!body?.accountName) {
        throw new BadRequestException('Could not resolve account name');
      }

      return {
        accountNumber: body.accountNumber,
        accountName: body.accountName,
        bankCode: body.bankCode,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Monnify validate account failed:', error?.response?.data || error.message);
      throw new BadRequestException(
        error?.response?.data?.responseMessage || 'Account validation failed',
      );
    }
  }

  // ═══════════════════════════════════════════
  //  STATUS CHECK HELPER
  // ═══════════════════════════════════════════

  isPaymentSuccessful(status: string): boolean {
    return ['PAID', 'OVERPAID'].includes(status?.toUpperCase());
  }

  isPaymentFailed(status: string): boolean {
    return ['FAILED', 'CANCELLED', 'EXPIRED', 'REVERSED'].includes(status?.toUpperCase());
  }

  isPaymentPending(status: string): boolean {
    return ['PENDING', 'PARTIALLY_PAID'].includes(status?.toUpperCase());
  }

  // ═══════════════════════════════════════════
  //  GET BANK LIST
  //  GET /api/v1/banks
  // ═══════════════════════════════════════════

  async getBankList(): Promise<{ name: string; code: string }[]> {
    const token = await this.getAccessToken();

    try {
      const response = await this.httpService.axiosRef.get(
        `${this.baseUrl}/api/v1/banks`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const body = response.data;
      if (!body?.requestSuccessful) {
        throw new BadRequestException('Failed to fetch bank list');
      }

      // Return only name and code for each bank
      return (body.responseBody || []).map((b: any) => ({
        name: b.name,
        code: b.code,
      }));
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Monnify get banks failed:', error?.response?.data || error.message);
      throw new BadRequestException('Failed to fetch bank list from payment provider');
    }
  }

  // ═══════════════════════════════════════════
  //  VALIDATE BANK ACCOUNT
  //  GET /api/v1/disbursements/account/validate?accountNumber=...&bankCode=...
  // ═══════════════════════════════════════════

  async validateBankAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountNumber: string; accountName: string; bankCode: string }> {
    const token = await this.getAccessToken();

    try {
      const response = await this.httpService.axiosRef.get(
        `${this.baseUrl}/api/v1/disbursements/account/validate`,
        {
          params: { accountNumber, bankCode },
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const body = response.data;
      if (!body?.requestSuccessful || !body?.responseBody) {
        throw new BadRequestException('Account validation failed');
      }

      return {
        accountNumber: body.responseBody.accountNumber,
        accountName: body.responseBody.accountName,
        bankCode: body.responseBody.bankCode,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Monnify validate account failed:', error?.response?.data || error.message);
      throw new BadRequestException(
        error?.response?.data?.responseMessage || 'Account validation failed. Please check the account number and bank.',
      );
    }
  }
}
