import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

export enum ItemCategoryStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({
  collection: 'item_categories',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class ItemCategory extends AbstractDocument {
  @ApiProperty({ example: 'documents' })
  @Prop({ type: String, required: true, unique: true })
  slug: string;

  @ApiProperty({ example: 'Documents' })
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ example: '📄' })
  @Prop({ type: String, required: false })
  emoji?: string;

  @ApiProperty({ example: 'Letters, contracts, certificates' })
  @Prop({ type: String, required: false })
  description?: string;

  @ApiProperty({ example: 1.0, description: 'Price multiplier applied to subtotal' })
  @Prop({ type: Number, required: true, default: 1.0 })
  priceMultiplier: number;

  @ApiProperty({ example: 0, description: 'Additional flat fee in currency units' })
  @Prop({ type: Number, default: 0 })
  additionalFee: number;

  @ApiProperty({ example: '+20%', description: 'Label shown to user (e.g. "+20%", "+₦300")' })
  @Prop({ type: String, required: false })
  priceLabel?: string;

  @ApiProperty({ enum: ItemCategoryStatusEnum })
  @Prop({
    type: String,
    enum: ItemCategoryStatusEnum,
    default: ItemCategoryStatusEnum.ACTIVE,
  })
  status: string;

  @ApiProperty({ description: 'Sort order for display' })
  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ItemCategorySchema = SchemaFactory.createForClass(ItemCategory);
export type ItemCategoryDocument = ItemCategory & Document;

ItemCategorySchema.index({ slug: 1 }, { unique: true });
ItemCategorySchema.index({ status: 1 });
ItemCategorySchema.index({ sortOrder: 1 });
