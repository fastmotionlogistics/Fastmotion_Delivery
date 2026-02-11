/* eslint-disable @typescript-eslint/no-unused-vars */
import { HttpService } from '@nestjs/axios';
import { BadRequestException, forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BalanceType, TransactionCategory } from '@libs/database';
import {
  encodeBase64,
  generateRandomString,
  MONNIFY_CONSTANTS,
  MonnifyAuthResponse,
  MonnifyPaymentInitiate,
  MonnifyPaymentResult,
  MonnifyTransactionResponse,
  TransactionStatus,
  TransactionType,
} from '@libs/common';
import { TransactionService } from './transaction.service';
import { AxiosResponse } from 'axios';
import { WalletRepository } from './repository/wallet.repository';

interface MonnifyMetadata {
  category: TransactionCategory;
  userId: string;
  paymentMethods: string[];
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => TransactionService))
    private readonly transactionService: TransactionService,
    private readonly walletRepository: WalletRepository,
  ) {}

  async authorize(): Promise<MonnifyAuthResponse> {
    try {
      const ff = await this.httpService.axiosRef.post(
        MONNIFY_CONSTANTS.Url.Authenticate,
        { key: '' },
        {
          headers: {
            Authorization: `Basic ${encodeBase64(
              this.configService.getOrThrow('MONNIFY_WALLET_API_KEY') +
                ':' +
                this.configService.getOrThrow('MONNIFY_WALLET_SECRET_KEY'),
            )}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const res: MonnifyAuthResponse = ff.data;
      if (!res.requestSuccessful) throw new UnauthorizedException(res.responseMessage);

      return res;
    } catch (error) {
      throw error;
    }
  }

  async initializeMonnifyTransaction(
    dto: Partial<MonnifyPaymentInitiate> & { metaData: MonnifyMetadata },
  ): Promise<MonnifyPaymentResult> {
    const ttRef = generateRandomString(12);
    const ddto = { ...dto };
    ddto.contractCode = this.configService.getOrThrow('MONNIFY_WALLET_CONTRACT_CODE');
    ddto.paymentReference = ttRef;
    ddto.currencyCode = 'NGN'; // This should be dynamic based on user's wallet currency
    ddto.paymentMethods = dto?.metaData?.paymentMethods || ['CARD', 'ACCOUNT_TRANSFER'];

    const token = await this.authorize();
    try {
      const ff = await this.httpService.axiosRef.post(
        MONNIFY_CONSTANTS.Url.InitiatePayment,
        { ...dto },
        {
          headers: {
            Authorization: `Bearer ${token.responseBody.accessToken}`,
          },
        },
      );
      const paymentRes = ff.data as MonnifyPaymentResult;
      if (ff.data) {
        const dWallet = await this.walletRepository.findAdmin();
        if (dWallet) {
          // Create transaction for deposit - amount is already in wallet currency
          await this.transactionService.createTransaction({
            amount: dto.amount,
            // currency: dWallet.currency,
            // currencySymbol: dWallet.currencySymbol,
            depositBalanceBefore: dWallet.depositBalance,
            depositBalanceAfter: dWallet.depositBalance + dto.amount,
            withdrawableBalanceBefore: dWallet.withdrawableBalance,
            withdrawableBalanceAfter: dWallet.withdrawableBalance,
            totalBalanceBefore: dWallet.totalBalance,
            totalBalanceAfter: dWallet.totalBalance + dto.amount,
            description: dto.paymentDescription,
            type: TransactionType.CREDIT,
            reference: ttRef,
            category: dto.metaData.category,
            balanceType: BalanceType.DEPOSIT,
            walletId: dWallet._id.toString(),
            userId: dto.metaData.userId,
            status: TransactionStatus.PENDING,
          });
          return ff.data;
        } else {
          throw new BadRequestException('Admin Not Found');
        }
      }
    } catch (error) {
      // console.log(error);
      throw error;
    }
  }

  async verifyTrx(transactionReference: string) {
    try {
      const token = await this.authorize();
      const { data: trxRes }: AxiosResponse<MonnifyTransactionResponse> = await this.httpService.axiosRef.get(
        MONNIFY_CONSTANTS.Url.VerifyTxn + encodeURIComponent(transactionReference),
        {
          headers: {
            Authorization: `Bearer ${token.responseBody.accessToken}`,
          },
        },
      );

      return trxRes.responseBody;
    } catch (error) {
      throw error;
    }
  }
}
