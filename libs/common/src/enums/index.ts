export enum Role {
  NORMAL_USER = 1,
  BAKERY = 2,
  ADMIN = 3,
  DELIVERY = 4,
}

export enum UserRolesEnum {
  ADMIN = 3,
  NORMAL_USER = 1,
  BAKERY = 2,
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

export const STATUS = {
  SUCCESS: 'success',

  FAILED: 'failed',

  ERROR: 'error',
};
export enum JudgeCriteriaEnum {
  CREATIVITY = 'CREATIVITY',
  ORIGINALITY = 'ORIGINALITY',
  RELEVANCE = 'RELEVANCE',
}

export enum ContestPrivacy {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}
export enum ContestType {
  STANDARD = 'STANDARD',
  SPONSORED = 'SPONSORED',
}
export enum ContestStatusEnum {
  PENDING = 'PENDING',
  POOLING = 'POOLING',
  SUBMISSION = 'SUBMISSION',
  VOTING = 'VOTING',
  CLOSED = 'CLOSED',
}
export enum ProfileLevel {
  NONE = 1,
  CREATE = 2,
  UPDATE = 3,
}

export enum TitleType {
  NONE = 1,
  Mr = 2,
  Mrs = 3,
  Miss = 4,
}

export enum WalletType {
  Main = 1,
  Supplementary = 2,
}
export enum TransactionType {
  DEBIT = 1,
  CREDIT = 2,
}
export enum WalletName {
  Main = 'Main',
  Supplementary = 'Supplementary',
}

export enum PartnerStatusType {
  AccountActivated = 1,
  AccountDeActivated = 2,
  AccountSuspended = 4,
  AccountAwaitingConfirmation = 5,
}
export enum LIKEDISLIKE {
  LIKE = 'like',
  DISLIKE = 'dislike',
}
export enum VoteDuration {
  ONE = 1,
  THREE = 3,
  ONE_WEEK = 7,
}
export enum AssetType {
  VIDEO = 1,
  IMAGE = 2,
}

export enum ProgressType {
  UPCOMING = 'UPCOMING',
  POOLING = 'POOLING',
  ONGOING = 'ONGOING',
}

export enum PaymentTransactionType {
  VOTE = 21,
  SUBSCRIPTION = 32,
  TOPUPWALLET = 35,
}

export enum PaymentMethodType {
  BANK_TRANSFER = 2,
  CHECKOUT_URL = 3,
  WALLET = 4,
}

export enum RequirementType {
  UPLOAD_VIDEO = 'UPLOAD_VIDEO',
  UPLOAD_PICTURE = 'UPLOAD_PICTURE',
  // Add more types if needed
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  REVERSED = 'REVERSED',
}
export enum MTransactionStatus {
  Pending = 0,
  Success = 1,
  Failed = 2,
  Calcelled = 3,
  Initiated = 4,
}

export enum BakeryOrderStatusEnum {
  RECEIVED = 'received',
  // COUNTERED = 'countered',
  PREPARING = 'preparing',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  DISPATCHED = 'dispatched',
  CANCELLED = 'cancelled',
}

export enum BakeryDeliveryOrderStatusEnum {
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProductStatusEnum {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum ProductUnitEnum {
  PIECE = 'piece',

  DOZEN = 'dozen',
  PACK = 'pack',
}
export enum OrderStatusEnum {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  RECEIVED = 'received',
  PREPARING = 'preparing',
  READY = 'ready',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum OrderPaymentStatusEnum {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum TransactionTypeEnum {
  CONTEST_ENTRY = 'CONTEST_ENTRY',
  PRIZE_PAYOUT = 'PRIZE_PAYOUT',
  REFUND = 'REFUND',
  PLATFORM_FEE = 'PLATFORM_FEE',
}

export enum TransactionStatusEnum {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethodEnum {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CRYPTOCURRENCY = 'CRYPTOCURRENCY',
  PLATFORM_CREDITS = 'PLATFORM_CREDITS',
}

export enum ParticipantStatusEnum {
  REGISTERED = 'REGISTERED',
  ACTIVE = 'ACTIVE',
  SUBMITTED = 'SUBMITTED',
  DISQUALIFIED = 'DISQUALIFIED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum PaymentStatusEnum {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  FREE = 'FREE',
}

export enum SubmissionStatusEnum {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DISQUALIFIED = 'DISQUALIFIED',
}

// Delivery Service Enums
export * from './delivery.enum';
