import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

@Schema({
  collection: 'pricing_config',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class PricingConfig extends AbstractDocument {
  @ApiProperty({ example: 'NGN' })
  @Prop({ type: String, required: true, default: 'NGN' })
  currency: string;

  @ApiProperty({ example: '₦' })
  @Prop({ type: String, required: true, default: '₦' })
  currencySymbol: string;

  // Base pricing
  @ApiProperty({ example: 500, description: 'Base delivery fee in smallest currency unit' })
  @Prop({ type: Number, required: true })
  baseDeliveryFee: number;

  @ApiProperty({ example: 50, description: 'Price per kilometer' })
  @Prop({ type: Number, required: true })
  pricePerKm: number;

  @ApiProperty({ example: 10, description: 'Price per minute (for time estimation)' })
  @Prop({ type: Number, required: false, default: 0 })
  pricePerMinute?: number;

  // Minimum and maximum
  @ApiProperty({ example: 500, description: 'Minimum delivery fee' })
  @Prop({ type: Number, required: true })
  minimumDeliveryFee: number;

  @ApiProperty({ example: 50000, description: 'Maximum delivery fee' })
  @Prop({ type: Number, required: false })
  maximumDeliveryFee?: number;

  // Quick vs Scheduled pricing
  @ApiProperty({ example: 1.0, description: 'Multiplier for quick delivery' })
  @Prop({ type: Number, default: 1.0 })
  quickDeliveryMultiplier: number;

  @ApiProperty({ example: 0.9, description: 'Multiplier for scheduled delivery (discount)' })
  @Prop({ type: Number, default: 1.0 })
  scheduledDeliveryMultiplier: number;

  // Inter-zone pricing
  @ApiProperty({ example: 1.2, description: 'Multiplier for deliveries between different zones' })
  @Prop({ type: Number, default: 1.0 })
  interZoneMultiplier: number;

  // Service fees
  @ApiProperty({ example: 0.05, description: 'Platform service fee percentage (0.05 = 5%)' })
  @Prop({ type: Number, default: 0 })
  serviceFeePercentage: number;

  @ApiProperty({ example: 100, description: 'Minimum service fee amount' })
  @Prop({ type: Number, default: 0 })
  minimumServiceFee: number;

  @ApiProperty({ example: 1000, description: 'Maximum service fee amount' })
  @Prop({ type: Number, required: false })
  maximumServiceFee?: number;

  // Insurance/protection
  @ApiProperty({ example: 0.01, description: 'Parcel protection fee percentage based on declared value' })
  @Prop({ type: Number, default: 0 })
  parcelProtectionPercentage: number;

  // Cancellation fees
  @ApiProperty({ example: 200, description: 'Cancellation fee if cancelled before rider accepts' })
  @Prop({ type: Number, default: 0 })
  cancellationFeeBeforeAccept: number;

  @ApiProperty({ example: 500, description: 'Cancellation fee if cancelled after rider accepts' })
  @Prop({ type: Number, default: 0 })
  cancellationFeeAfterAccept: number;

  @ApiProperty({ example: 0.5, description: 'Cancellation fee percentage after pickup (of total)' })
  @Prop({ type: Number, default: 0.5 })
  cancellationFeeAfterPickupPercentage: number;

  // ── Size-based pricing ──
  @ApiProperty({
    example: { small: 0, medium: 200, large: 500, extra_large: 1000 },
    description: 'Additional flat fee per parcel size on top of base delivery fee',
  })
  @Prop({
    type: Object,
    default: { small: 0, medium: 200, large: 500, extra_large: 1000 },
  })
  sizeFees: Record<string, number>;

  @ApiProperty({
    example: { small: 1.0, medium: 1.0, large: 1.2, extra_large: 1.5 },
    description: 'Multiplier per parcel size applied to the subtotal',
  })
  @Prop({
    type: Object,
    default: { small: 1.0, medium: 1.0, large: 1.2, extra_large: 1.5 },
  })
  sizeMultipliers: Record<string, number>;

  // ── Category-based pricing ──
  @ApiProperty({
    example: { documents: 1.0, clothes: 1.0, food: 1.1, electronics: 1.3, fragile: 1.5, other: 1.0 },
    description: 'Multiplier per parcel category',
  })
  @Prop({
    type: Object,
    default: {
      documents: 1.0,
      clothes: 1.0,
      food: 1.1,
      electronics: 1.3,
      fragile: 1.5,
      other: 1.0,
    },
  })
  categoryMultipliers: Record<string, number>;

  // ── Rider Commission ──
  @ApiProperty({
    example: 0.80,
    description: 'Percentage of delivery fee that goes to rider (0.80 = 80%). The remaining 20% is platform commission.',
  })
  @Prop({ type: Number, default: 0.80 })
  riderCommissionPercentage: number;

  @ApiProperty({
    example: 100,
    description: 'Minimum amount rider receives per delivery regardless of commission',
  })
  @Prop({ type: Number, default: 100 })
  minimumRiderPayout: number;

  // Rescheduling fees
  @ApiProperty({ example: 100, description: 'Fee for rescheduling' })
  @Prop({ type: Number, default: 0 })
  reschedulingFee: number;

  // Active status
  @ApiProperty({ description: 'Whether this config is currently active' })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  // Effective date range
  @ApiProperty()
  @Prop({ type: Date, required: false })
  effectiveFrom?: Date;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  effectiveUntil?: Date;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PricingConfigSchema = SchemaFactory.createForClass(PricingConfig);
export type PricingConfigDocument = PricingConfig & Document;

// Indexes
PricingConfigSchema.index({ isActive: 1 });
PricingConfigSchema.index({ effectiveFrom: 1, effectiveUntil: 1 });
