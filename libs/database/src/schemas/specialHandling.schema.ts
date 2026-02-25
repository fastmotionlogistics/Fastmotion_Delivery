import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

export enum SpecialHandlingStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({
  collection: 'special_handling',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class SpecialHandling extends AbstractDocument {
  @ApiProperty({ example: 'fragile' })
  @Prop({ type: String, required: true, unique: true })
  slug: string;

  @ApiProperty({ example: 'Fragile' })
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ example: 'Handle with extra care' })
  @Prop({ type: String, required: false })
  description?: string;

  @ApiProperty({ example: 300, description: 'Additional flat fee in currency units' })
  @Prop({ type: Number, required: true, default: 0 })
  additionalFee: number;

  @ApiProperty({ example: 1.0, description: 'Price multiplier (usually 1.0 for flat-fee items)' })
  @Prop({ type: Number, default: 1.0 })
  priceMultiplier: number;

  @ApiProperty({ example: '+₦300', description: 'Label shown to user' })
  @Prop({ type: String, required: false })
  priceLabel?: string;

  @ApiProperty({ example: '#FEE2E2', description: 'Background color for the chip' })
  @Prop({ type: String, required: false })
  bgColor?: string;

  @ApiProperty({ example: '#DC2626', description: 'Text color for the chip' })
  @Prop({ type: String, required: false })
  textColor?: string;

  @ApiProperty({ enum: SpecialHandlingStatusEnum })
  @Prop({
    type: String,
    enum: SpecialHandlingStatusEnum,
    default: SpecialHandlingStatusEnum.ACTIVE,
  })
  status: string;

  @ApiProperty({ description: 'Sort order for display' })
  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SpecialHandlingSchema = SchemaFactory.createForClass(SpecialHandling);
export type SpecialHandlingDocument = SpecialHandling & Document;

SpecialHandlingSchema.index({ slug: 1 }, { unique: true });
SpecialHandlingSchema.index({ status: 1 });
SpecialHandlingSchema.index({ sortOrder: 1 });
