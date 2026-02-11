import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';
import {
  DeliveryStatusEnum,
  DeliveryTypeEnum,
  DeliveryPaymentStatusEnum,
  DeliveryPaymentMethodEnum,
  ParcelSizeEnum,
} from '../../../common/src/enums/delivery.enum';

// Embedded schema for location details
@Schema({ _id: false })
export class LocationDetails {
  @Prop({ type: String, required: true })
  address: string;

  @Prop({ type: String, required: true })
  latitude: string;

  @Prop({ type: String, required: true })
  longitude: string;

  @Prop({ type: String, required: false })
  landmark?: string;

  @Prop({ type: String, required: false })
  contactName?: string;

  @Prop({ type: String, required: false })
  contactPhone?: string;

  @Prop({ type: String, required: false })
  additionalNotes?: string;
}

// Embedded schema for parcel details
@Schema({ _id: false })
export class ParcelDetails {
  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, enum: ParcelSizeEnum, default: ParcelSizeEnum.SMALL })
  size: string;

  @Prop({ type: Number, required: false })
  weight?: number; // in kg

  @Prop({ type: Number, required: false })
  quantity?: number;

  @Prop({ type: Boolean, default: false })
  isFragile: boolean;

  @Prop({ type: String, required: false })
  category?: string;

  @Prop({ type: Number, required: false })
  declaredValue?: number;
}

// Embedded schema for pricing details
@Schema({ _id: false })
export class PricingDetails {
  @Prop({ type: Number, required: true })
  basePrice: number;

  @Prop({ type: Number, required: true })
  distancePrice: number;

  @Prop({ type: Number, default: 0 })
  weightPrice: number;

  @Prop({ type: Number, default: 0 })
  timeMultiplierPrice: number;

  @Prop({ type: Number, default: 0 })
  zoneMultiplierPrice: number;

  @Prop({ type: Number, default: 0 })
  surgePrice: number;

  @Prop({ type: Number, default: 0 })
  serviceFee: number;

  @Prop({ type: Number, default: 0 })
  discountAmount: number;

  @Prop({ type: Types.ObjectId, ref: 'Coupon', required: false })
  couponApplied?: Types.ObjectId;

  @Prop({ type: String, required: false })
  couponCode?: string;

  @Prop({ type: Number, required: true })
  subtotal: number;

  @Prop({ type: Number, required: true })
  totalPrice: number;

  @Prop({ type: String, default: 'NGN' })
  currency: string;

  // Multipliers applied (for audit)
  @Prop({ type: Number, default: 1.0 })
  zoneMultiplier: number;

  @Prop({ type: Number, default: 1.0 })
  weightMultiplier: number;

  @Prop({ type: Number, default: 1.0 })
  timeMultiplier: number;

  @Prop({ type: Number, default: 1.0 })
  deliveryTypeMultiplier: number;
}

// Embedded schema for rescheduling history
@Schema({ _id: false })
export class RescheduleHistory {
  @Prop({ type: Date, required: true })
  previousScheduledTime: Date;

  @Prop({ type: Date, required: true })
  newScheduledTime: Date;

  @Prop({ type: Number, required: false })
  additionalPayment?: number;

  @Prop({ type: String, required: false })
  reason?: string;

  @Prop({ type: Date, required: true })
  rescheduledAt: Date;
}

// Embedded schema for admin actions audit
@Schema({ _id: false })
export class AdminAction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  admin: Types.ObjectId;

  @Prop({ type: String, required: true })
  action: string; // 'pin_override', 'manual_complete', 'manual_cancel', 'price_adjustment', etc.

  @Prop({ type: String, required: false })
  reason?: string;

  @Prop({ type: Object, required: false })
  previousValue?: Record<string, any>;

  @Prop({ type: Object, required: false })
  newValue?: Record<string, any>;

  @Prop({ type: Date, required: true })
  performedAt: Date;
}

@Schema({
  collection: 'delivery_requests',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class DeliveryRequest extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: String, required: true, unique: true })
  trackingNumber: string;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customer: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Rider', required: false })
  rider?: Types.ObjectId;

  // Delivery Type
  @ApiProperty()
  @Prop({
    type: String,
    enum: DeliveryTypeEnum,
    required: true,
  })
  deliveryType: string;

  // Status
  @ApiProperty()
  @Prop({
    type: String,
    enum: DeliveryStatusEnum,
    default: DeliveryStatusEnum.PENDING,
  })
  status: string;

  // Locations
  @ApiProperty()
  @Prop({ type: LocationDetails, required: true })
  pickupLocation: LocationDetails;

  @ApiProperty()
  @Prop({ type: LocationDetails, required: true })
  dropoffLocation: LocationDetails;

  // Parcel
  @ApiProperty()
  @Prop({ type: ParcelDetails, required: true })
  parcelDetails: ParcelDetails;

  // Distance & Time
  @ApiProperty()
  @Prop({ type: Number, required: true })
  estimatedDistance: number; // in km

  @ApiProperty()
  @Prop({ type: Number, required: true })
  estimatedDuration: number; // in minutes

  @ApiProperty()
  @Prop({ type: Number, required: false })
  actualDistance?: number;

  @ApiProperty()
  @Prop({ type: Number, required: false })
  actualDuration?: number;

  // Pricing
  @ApiProperty()
  @Prop({ type: PricingDetails, required: true })
  pricing: PricingDetails;

  // Payment
  @ApiProperty()
  @Prop({
    type: String,
    enum: DeliveryPaymentStatusEnum,
    default: DeliveryPaymentStatusEnum.PENDING,
  })
  paymentStatus: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: DeliveryPaymentMethodEnum,
    required: false,
  })
  paymentMethod?: string;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Payment', required: false })
  payment?: Types.ObjectId;

  // Scheduling (for scheduled deliveries)
  @ApiProperty()
  @Prop({ type: Date, required: false })
  scheduledPickupTime?: Date;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  scheduledDeliveryTime?: Date;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isRescheduled: boolean;

  @ApiProperty()
  @Prop({ type: Number, default: 0 })
  rescheduleCount: number;

  // PINs
  @ApiProperty()
  @Prop({ type: String, required: false, select: false })
  pickupPin?: string;

  @ApiProperty()
  @Prop({ type: String, required: false, select: false })
  deliveryPin?: string;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  pickupPinVerified: boolean;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  deliveryPinVerified: boolean;

  // Timestamps for tracking
  @ApiProperty()
  @Prop({ type: Date, required: false })
  riderAssignedAt?: Date;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  riderAcceptedAt?: Date;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  arrivedAtPickupAt?: Date;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  pickedUpAt?: Date;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  arrivedAtDropoffAt?: Date;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  deliveredAt?: Date;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  completedAt?: Date;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  cancelledAt?: Date;

  @ApiProperty()
  @Prop({ type: String, required: false })
  cancellationReason?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  cancelledBy?: string; // 'customer' | 'rider' | 'admin'

  // Rating
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Rating', required: false })
  rating?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isRated: boolean;

  // Disputes
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Dispute', required: false })
  dispute?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  hasDispute: boolean;

  // Zone references for pricing
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'LocationZone', required: false })
  pickupZone?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'LocationZone', required: false })
  dropoffZone?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isInterZoneDelivery: boolean;

  // Weight and Time pricing references (for audit)
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'WeightPricing', required: false })
  weightPricingApplied?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'TimePricing', required: false })
  timePricingApplied?: Types.ObjectId;

  // Rescheduling (enhanced)
  @ApiProperty()
  @Prop({ type: Boolean, default: true })
  canReschedule: boolean; // Set to false when rider arrives at pickup

  @ApiProperty()
  @Prop({ type: [RescheduleHistory], default: [] })
  rescheduleHistory?: RescheduleHistory[];

  @ApiProperty()
  @Prop({ type: Number, default: 0 })
  additionalPaymentForReschedule: number;

  // Quick delivery specific - Payment at pickup
  @ApiProperty({ description: 'For quick delivery: payment required at pickup' })
  @Prop({ type: Boolean, default: false })
  paymentRequiredAtPickup: boolean;

  @ApiProperty({ description: 'When rider arrived and payment was requested' })
  @Prop({ type: Date, required: false })
  paymentRequestedAt?: Date;

  // Admin override capabilities
  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  pickupPinOverridden: boolean;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  deliveryPinOverridden: boolean;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  completedByAdmin: boolean;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  cancelledByAdmin: boolean;

  @ApiProperty()
  @Prop({ type: [AdminAction], default: [] })
  adminActions?: AdminAction[];

  // Rider visibility control
  @ApiProperty({ description: 'Whether customer can see rider contact (default: false)' })
  @Prop({ type: Boolean, default: false })
  showRiderContact: boolean;

  // Additional metadata
  @ApiProperty()
  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DeliveryRequestSchema = SchemaFactory.createForClass(DeliveryRequest);
export type DeliveryRequestDocument = DeliveryRequest & Document;

// Indexes
DeliveryRequestSchema.index({ trackingNumber: 1 });
DeliveryRequestSchema.index({ customer: 1 });
DeliveryRequestSchema.index({ rider: 1 });
DeliveryRequestSchema.index({ status: 1 });
DeliveryRequestSchema.index({ deliveryType: 1 });
DeliveryRequestSchema.index({ paymentStatus: 1 });
DeliveryRequestSchema.index({ createdAt: -1 });
DeliveryRequestSchema.index({ scheduledPickupTime: 1 });
