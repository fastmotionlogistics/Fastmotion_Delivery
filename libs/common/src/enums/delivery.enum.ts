// Delivery Request Status
export enum DeliveryStatusEnum {
  // Initial states
  PENDING = 'pending', // Request created, waiting for rider (quick) or admin assignment (scheduled)
  SEARCHING_RIDER = 'searching_rider', // Quick: actively searching for nearby riders

  // Rider acceptance states
  RIDER_ACCEPTED = 'rider_accepted', // Quick: rider accepted, traveling to pickup
  RIDER_ASSIGNED = 'rider_assigned', // Scheduled: admin assigned rider

  // Pickup flow
  RIDER_EN_ROUTE_PICKUP = 'rider_en_route_pickup', // Rider traveling to pickup location
  RIDER_ARRIVED_PICKUP = 'rider_arrived_pickup', // Rider at pickup, waiting for payment (quick) or PIN
  AWAITING_PAYMENT = 'awaiting_payment', // Quick delivery: payment required before pickup
  PAYMENT_CONFIRMED = 'payment_confirmed', // Payment done, ready for pickup PIN
  PICKUP_IN_PROGRESS = 'pickup_in_progress', // PIN verified, pickup happening
  PICKED_UP = 'picked_up', // Parcel picked up, starting transit

  // Transit & Delivery
  IN_TRANSIT = 'in_transit', // Rider traveling to dropoff
  RIDER_ARRIVED_DROPOFF = 'rider_arrived_dropoff', // Rider at dropoff, waiting for delivery PIN
  DELIVERY_IN_PROGRESS = 'delivery_in_progress', // Delivery PIN verified, handover happening
  DELIVERED = 'delivered', // Parcel handed over

  // Completion states
  COMPLETED = 'completed', // Fully completed (payment done, rated)
  CANCELLED = 'cancelled', // Cancelled by customer, rider, or admin
  FAILED = 'failed', // Failed due to technical/other issues

  // Scheduled-specific
  SCHEDULED = 'scheduled', // Scheduled delivery confirmed, waiting for pickup time
}

// Delivery Type
export enum DeliveryTypeEnum {
  QUICK = 'quick',
  SCHEDULED = 'scheduled',
}

// Rider Status
export enum RiderStatusEnum {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
  ON_DELIVERY = 'on_delivery',
}

// Rider Verification Status
export enum RiderVerificationStatusEnum {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

// Payment Status for Delivery
export enum DeliveryPaymentStatusEnum {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

// Payment Method for Delivery
export enum DeliveryPaymentMethodEnum {
  WALLET = 'wallet',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  // Note: CASH/Pay on Delivery is NOT supported per PRD
}

// When payment is required
export enum PaymentTimingEnum {
  AT_REQUEST = 'at_request', // Scheduled: pay when creating request
  AT_PICKUP = 'at_pickup', // Quick: pay when rider arrives at pickup
}

// Cancellation fee type
export enum CancellationStageEnum {
  BEFORE_RIDER_ACCEPT = 'before_rider_accept', // Before any rider accepts
  AFTER_RIDER_ACCEPT = 'after_rider_accept', // After rider accepts, before pickup
  AFTER_PICKUP = 'after_pickup', // After parcel is picked up (partial refund)
}

// Admin action types
export enum AdminActionTypeEnum {
  PIN_OVERRIDE = 'pin_override',
  MANUAL_COMPLETE = 'manual_complete',
  MANUAL_CANCEL = 'manual_cancel',
  PRICE_ADJUSTMENT = 'price_adjustment',
  RIDER_REASSIGN = 'rider_reassign',
  REFUND_ISSUED = 'refund_issued',
  DISPUTE_RESOLVED = 'dispute_resolved',
}

// Coupon Status
export enum CouponStatusEnum {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  USED = 'used',
  DISABLED = 'disabled',
}

// Coupon Type
export enum CouponTypeEnum {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

// Dispute Status
export enum DisputeStatusEnum {
  OPEN = 'open',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  ESCALATED = 'escalated',
}

// Dispute Reason
export enum DisputeReasonEnum {
  DELIVERY_NOT_COMPLETED = 'delivery_not_completed',
  PARCEL_DAMAGED = 'parcel_damaged',
  PARCEL_LOST = 'parcel_lost',
  WRONG_DELIVERY = 'wrong_delivery',
  LATE_DELIVERY = 'late_delivery',
  RIDER_MISCONDUCT = 'rider_misconduct',
  OVERCHARGED = 'overcharged',
  OTHER = 'other',
}

// Vehicle Type
export enum VehicleTypeEnum {
  MOTORCYCLE = 'motorcycle',
  BICYCLE = 'bicycle',
  CAR = 'car',
  VAN = 'van',
  TRUCK = 'truck',
}

// Parcel Size
export enum ParcelSizeEnum {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large',
}

// PIN Type
export enum PinTypeEnum {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
}
