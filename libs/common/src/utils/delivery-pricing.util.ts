// ─────────────────────────────────────────────────────────────────────────────
// Shared delivery pricing calculator
//
// Both user-api and admin-api use this function. Callers are responsible for
// resolving DB lookups (config, zones, timePricing, category, coupon, etc.)
// and passing plain values in. This function contains only arithmetic — no I/O.
// ─────────────────────────────────────────────────────────────────────────────

export interface DeliveryPricingConfig {
  baseDeliveryFee: number;
  pricePerKm: number;
  minimumDeliveryFee: number;
  maximumDeliveryFee?: number | null;
  quickDeliveryMultiplier?: number;
  scheduledDeliveryMultiplier?: number;
  interZoneMultiplier?: number;
  serviceFeePercentage?: number;
  minimumServiceFee?: number;
  maximumServiceFee?: number | null;
  fctDevelopmentLevy?: number;
  sizeFees?: Record<string, number>;
  riderCommissionPercentage?: number;
  minimumRiderPayout?: number;
  currency: string;
  currencySymbol?: string;
}

export interface ResolvedZone {
  _id: any;
  name: string;
  code: string;
  priceMultiplier?: number;
}

export interface ResolvedTimePricing {
  _id: any;
  name: string;
  priceMultiplier?: number;
  additionalFee?: number;
  isPeakPeriod?: boolean;
}

export interface ResolvedCoupon {
  _id: any;
  code: string;
  /** CouponTypeEnum value: 'percentage' | 'fixed' */
  type: string;
  /** Discount amount or percentage value */
  value: number;
  maxDiscountAmount?: number | null;
}

export interface DeliveryPricingInput {
  /** Road distance in km (client-provided or Haversine fallback) */
  distance: number;
  /** Estimated duration in minutes */
  duration: number;
  config: DeliveryPricingConfig;
  pickupZone?: ResolvedZone | null;
  dropoffZone?: ResolvedZone | null;
  timePricing?: ResolvedTimePricing | null;
  /** 'quick' | 'scheduled' */
  deliveryType: string;
  /** 'small' | 'medium' | 'large' | 'extra_large' */
  parcelSize?: string;
  /** Resolved category price multiplier (1.0 if none) */
  categoryMultiplier?: number;
  /** Flat additional fee from category (0 if none) */
  categoryAdditionalFee?: number;
  /** Sum of all special-handling flat fees (0 if none) */
  handlingTotalFee?: number;
  /** Pre-validated coupon (null if not applicable) */
  coupon?: ResolvedCoupon | null;
}

export interface DeliveryPricingBreakdown {
  basePrice: number;
  distancePrice: number;
  /** Flat fee from time pricing slot */
  timePrice: number;
  /** Placeholder — weight pricing removed */
  weightPrice: number;
  sizeFee: number;
  categoryAdditionalFee: number;
  handlingFee: number;
  fctDevelopmentLevy: number;
  /** Incremental: categoryMult contribution on top of base components */
  categoryMultiplierPrice: number;
  /** Incremental: zoneMult contribution on top of after-category subtotal */
  zoneMultiplierPrice: number;
  /** Incremental: timeMult contribution on top of after-zone subtotal */
  timeMultiplierPrice: number;
  /** Incremental: interZoneMult contribution on top of after-time subtotal */
  interZoneMultiplierPrice: number;
  /** Surge placeholder — always 0 */
  surgePrice: number;
  serviceFee: number;
  discountAmount: number;
  couponApplied?: any;
  couponCode?: string;
  subtotal: number;
  totalPrice: number;
  currency: string;
  currencySymbol: string;
  zoneMultiplier: number;
  /** Weight multiplier placeholder — always 1.0 */
  weightMultiplier: number;
  timeMultiplier: number;
  categoryMultiplier: number;
  deliveryTypeMultiplier: number;
  interZoneMultiplier: number;
  riderEarnings: number;
}

export interface DeliveryPricingResult {
  estimatedDistance: number;
  estimatedDuration: number;
  pickupZone: ResolvedZone | null;
  dropoffZone: ResolvedZone | null;
  isInterZone: boolean;
  timePricing: ResolvedTimePricing | null;
  coupon: ResolvedCoupon | null;
  breakdown: DeliveryPricingBreakdown;
}

export function computeDeliveryPricing(input: DeliveryPricingInput): DeliveryPricingResult {
  const {
    distance,
    duration,
    config,
    pickupZone = null,
    dropoffZone = null,
    timePricing = null,
    deliveryType,
    parcelSize = 'medium',
    categoryMultiplier: catMult = 1.0,
    categoryAdditionalFee: catFee = 0,
    handlingTotalFee = 0,
    coupon = null,
  } = input;

  const isInterZone =
    pickupZone != null && dropoffZone != null && pickupZone._id.toString() !== dropoffZone._id.toString();

  // ── Multipliers ───────────────────────────────────────────────────────────
  const zoneMultiplier = pickupZone?.priceMultiplier ?? 1.0;
  const timeMultiplier = timePricing?.priceMultiplier ?? 1.0;
  const interZoneMultiplier = isInterZone ? config.interZoneMultiplier ?? 1.0 : 1.0;
  const categoryMultiplier = catMult;

  // ── Component prices ──────────────────────────────────────────────────────
  const basePrice = config.baseDeliveryFee;
  const distancePrice = Math.round(distance * config.pricePerKm);
  const timePrice = timePricing?.additionalFee ?? 0;
  const sizeFee = config.sizeFees?.[parcelSize] ?? 0;

  // ── Subtotal — additive multiplier application ───────────────────────────
  // Each multiplier's incremental contribution is computed independently
  // against preMultiplierBase (not chained), so they sum linearly.
  // serviceFee is also derived from preMultiplierBase, not the inflated subtotal.
  const dpreMultiplierBase = basePrice + distancePrice;
  const preMultiplierBase = basePrice + distancePrice + timePrice + sizeFee + catFee + handlingTotalFee;

  const categoryMultiplierPrice = Math.round(preMultiplierBase * (categoryMultiplier - 1));
  const zoneMultiplierPrice = Math.round(preMultiplierBase * (zoneMultiplier - 1));
  const timeMultiplierPrice = Math.round(preMultiplierBase * (timeMultiplier - 1));
  const interZoneMultiplierPrice = Math.round(preMultiplierBase * (interZoneMultiplier - 1));

  let subtotal =
    preMultiplierBase + categoryMultiplierPrice + zoneMultiplierPrice + timeMultiplierPrice + interZoneMultiplierPrice;

  // Clamp to min/max
  subtotal = Math.max(subtotal, config.minimumDeliveryFee);
  if (config.maximumDeliveryFee) {
    subtotal = Math.min(subtotal, config.maximumDeliveryFee);
  }

  // FCT development levy is part of the delivery cost (applied before service fee)
  const fctDevelopmentLevy = config.fctDevelopmentLevy ?? 0;
  if (fctDevelopmentLevy > 0) {
    subtotal = subtotal + fctDevelopmentLevy;
  }

  // ── Service fee (% of preMultiplierBase, not inflated subtotal) ───────────
  let serviceFee = Math.round(dpreMultiplierBase * (config.serviceFeePercentage ?? 0));
  serviceFee = Math.max(serviceFee, config.minimumServiceFee ?? 0);
  if (config.maximumServiceFee) {
    serviceFee = Math.min(serviceFee, config.maximumServiceFee);
  }

  // ── Coupon discount ───────────────────────────────────────────────────────
  let discountAmount = 0;
  if (coupon) {
    if (coupon.type === 'percentage') {
      discountAmount = Math.round(subtotal * (coupon.value / 100));
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else {
      discountAmount = coupon.value;
    }
    discountAmount = Math.min(discountAmount, subtotal);
  }

  const totalPrice = subtotal + serviceFee - discountAmount;

  // ── Rider earnings ────────────────────────────────────────────────────────
  const riderCommission = config.riderCommissionPercentage ?? 0.8;
  const riderEarnings = Math.max(Math.round(totalPrice * riderCommission), config.minimumRiderPayout ?? 100);

  return {
    estimatedDistance: Math.round(distance * 100) / 100,
    estimatedDuration: duration,
    pickupZone,
    dropoffZone,
    isInterZone,
    timePricing,
    coupon,
    breakdown: {
      basePrice,
      distancePrice,
      timePrice,
      weightPrice: 0,
      sizeFee,
      categoryAdditionalFee: catFee,
      handlingFee: handlingTotalFee,
      fctDevelopmentLevy,
      categoryMultiplierPrice,
      zoneMultiplierPrice,
      timeMultiplierPrice,
      interZoneMultiplierPrice,
      surgePrice: 0,
      serviceFee,
      discountAmount,
      couponApplied: coupon?._id ?? undefined,
      couponCode: coupon?.code ?? undefined,
      subtotal,
      totalPrice,
      currency: config.currency,
      currencySymbol: config.currencySymbol ?? '',
      zoneMultiplier,
      weightMultiplier: 1.0,
      timeMultiplier,
      categoryMultiplier,
      deliveryTypeMultiplier: 1.0,
      interZoneMultiplier,
      riderEarnings,
    },
  };
}
