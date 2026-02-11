export const REQUEST_METHODS = {
  GET: 'GET',

  POST: 'POST',

  PUT: 'PUT',

  PATCH: 'PATCH',

  DELETE: 'DELETE',
};

export const MONGOOSE = {
  CAST_ERROR: 'Cast',
  VALIDATION_ERROR: 'ValidationError',
  OBJECT_ID: 'ObjectId',
};

export const ENVIRONMENT = {
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
  TEST: 'test',
};
export const SUBSCRIPTION_EXPIRE_TIME = 2;
const qoreIdBaseUrl = 'https://api.qoreid.com/';

export const QOREID_CONSTANTS = {
  token: qoreIdBaseUrl + 'token',
  vNIN: qoreIdBaseUrl + 'v1/ng/identities/virtual-nin/',
};
const Monnify_Base_URL = 'https://sandbox.monnify.com/api/';
export const MONNIFY_CONSTANTS = {
  Url: {
    BaseUrl: 'https://sandbox.monnify.com/api/',
    ReserveAccount: Monnify_Base_URL + 'v2/bank-transfer/reserved-accounts',
    Authenticate: Monnify_Base_URL + 'v1/auth/login',
    AccountValidate: Monnify_Base_URL + 'v1/disbursements/account/validate?',
    VerifyBvn: 'https://api.monnify.com/api/v1/vas/bvn-account-match',
    VerifyTxn: Monnify_Base_URL + 'v2/transactions/',
    ChargeCard: Monnify_Base_URL + 'v1/merchant/cards/charge-card-token',
    InitiatePayment: Monnify_Base_URL + 'v1/merchant/transactions/init-transaction',
    InitiateBankPayment: Monnify_Base_URL + 'v1/merchant/bank-transfer/init-payment',
    InitiateDisbursement: Monnify_Base_URL + 'v2/disbursements/single',
    InitiateBatchDisbursement: Monnify_Base_URL + 'v2/disbursements/batch',
    BatchDisbursementStatus: Monnify_Base_URL + '/v2/disbursements/batch/summary?reference=',
    DisbursementStatus: Monnify_Base_URL + 'v2/disbursements/single/summary?reference=',
    DisbursementResendOTP: Monnify_Base_URL + 'v2/disbursements/single/resend-otp',
    AccountBalance: Monnify_Base_URL + 'v2/disbursements/wallet-balance?accountNumber=',
    UpdateBvn: Monnify_Base_URL + 'v1/bank-transfer/reserved-accounts/update-customer-bvn/',
    Banks: Monnify_Base_URL + 'v1/banks',
  },
  DisbursementStatus: {
    SuccessDisbursementStatus: 'SUCCESS|COMPLETED',
    FailedDisbursementStatus: 'FAILED|PENDING_AUTHORIZATION|OTP_EMAIL_DISPATCH_FAILED',
    PendingDisbursementStatus: 'PENDING|AWAITING_PROCESSING|IN_PROGRESS',
    ReversedDisbursementStatus: 'REVERSED|EXPIRED',
  },
  EventStatus: {
    SuccessTxnEvent: 'SUCCESSFUL_TRANSACTION',
    SuccessDisbEvent: 'SUCCESSFUL_DISBURSEMENT',
    FailedDisbEvent: 'FAILED_DISBURSEMENT',
    SuccessRefundEvent: 'SUCCESSFUL_REFUND',
    FailedRefundEvent: 'FAILED_REFUND',
    SettlementEvent: 'SETTLEMENT',
  },
  ResponseCode: {
    SuccessResponseCode: 'PAID',
    FailedResponseCode: 'PENDING',
    PendingResponseCode: 'FAILED',
  },
  CountryCode: 'NGN',
  PreferredBanks: ['035'],
  DisbursementFee: {
    Below5K: 10,
    Below10K: 15,
    Below50K: 20,
    Above50K: 40,
  },
  TransactionFee: {
    Card: 1.5,
    CardCap: 2000.0,
    AccountTransfer: 1.0,
    AccountTransferCap: 500.0,
  },
};
