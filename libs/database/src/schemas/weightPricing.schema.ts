import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

export enum WeightPricingStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({
  collection: 'weight_pricing',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class WeightPricing extends AbstractDocument {
  @ApiProperty({ example: 'Light Parcel' })
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ example: 0, description: 'Minimum weight in kg (inclusive)' })
  @Prop({ type: Number, required: true })
  minWeightKg: number;

  @ApiProperty({ example: 5, description: 'Maximum weight in kg (exclusive)' })
  @Prop({ type: Number, required: true })
  maxWeightKg: number;

  @ApiProperty({ example: 1.0, description: 'Price multiplier for this weight range' })
  @Prop({ type: Number, required: true, default: 1.0 })
  priceMultiplier: number;

  @ApiProperty({ example: 0, description: 'Additional flat fee for this weight range' })
  @Prop({ type: Number, default: 0 })
  additionalFee: number;

  @ApiProperty({ example: 'Small items under 5kg' })
  @Prop({ type: String, required: false })
  description?: string;

  @ApiProperty({ enum: WeightPricingStatusEnum })
  @Prop({
    type: String,
    enum: WeightPricingStatusEnum,
    default: WeightPricingStatusEnum.ACTIVE,
  })
  status: string;

  @ApiProperty({ description: 'Sort order for display' })
  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WeightPricingSchema = SchemaFactory.createForClass(WeightPricing);
export type WeightPricingDocument = WeightPricing & Document;

// Indexes
WeightPricingSchema.index({ minWeightKg: 1, maxWeightKg: 1 });
WeightPricingSchema.index({ status: 1 });
WeightPricingSchema.index({ sortOrder: 1 });
