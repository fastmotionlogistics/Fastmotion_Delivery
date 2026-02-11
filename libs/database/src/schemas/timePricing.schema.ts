import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

export enum TimePricingStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum DayOfWeekEnum {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

@Schema({
  collection: 'time_pricing',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class TimePricing extends AbstractDocument {
  @ApiProperty({ example: 'Rush Hour Morning' })
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ example: '07:00', description: 'Start time in 24h format (HH:mm)' })
  @Prop({ type: String, required: true })
  startTime: string;

  @ApiProperty({ example: '09:00', description: 'End time in 24h format (HH:mm)' })
  @Prop({ type: String, required: true })
  endTime: string;

  @ApiProperty({ enum: DayOfWeekEnum, isArray: true, description: 'Days this pricing applies' })
  @Prop({
    type: [String],
    enum: DayOfWeekEnum,
    default: Object.values(DayOfWeekEnum),
  })
  daysOfWeek: string[];

  @ApiProperty({ example: 1.5, description: 'Price multiplier for this time slot' })
  @Prop({ type: Number, required: true, default: 1.0 })
  priceMultiplier: number;

  @ApiProperty({ example: 0, description: 'Additional flat fee for this time slot' })
  @Prop({ type: Number, default: 0 })
  additionalFee: number;

  @ApiProperty({ example: 'Peak morning traffic hours' })
  @Prop({ type: String, required: false })
  description?: string;

  @ApiProperty({ description: 'Whether this is a peak/surge period' })
  @Prop({ type: Boolean, default: false })
  isPeakPeriod: boolean;

  @ApiProperty({ description: 'Whether deliveries are available during this time' })
  @Prop({ type: Boolean, default: true })
  isDeliveryAvailable: boolean;

  @ApiProperty({ description: 'Priority for overlapping time slots (higher = takes precedence)' })
  @Prop({ type: Number, default: 1 })
  priority: number;

  @ApiProperty({ enum: TimePricingStatusEnum })
  @Prop({
    type: String,
    enum: TimePricingStatusEnum,
    default: TimePricingStatusEnum.ACTIVE,
  })
  status: string;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TimePricingSchema = SchemaFactory.createForClass(TimePricing);
export type TimePricingDocument = TimePricing & Document;

// Indexes
TimePricingSchema.index({ startTime: 1, endTime: 1 });
TimePricingSchema.index({ status: 1 });
TimePricingSchema.index({ daysOfWeek: 1 });
TimePricingSchema.index({ priority: -1 });
