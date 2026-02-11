import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

@Schema({
  collection: 'ratings',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class Rating extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'DeliveryRequest', required: true })
  deliveryRequest: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customer: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Rider', required: true })
  rider: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Number, required: true, min: 1, max: 5 })
  score: number;

  @ApiProperty()
  @Prop({ type: String, required: false, maxlength: 500 })
  comment?: string;

  // Specific rating categories
  @ApiProperty()
  @Prop({ type: Number, required: false, min: 1, max: 5 })
  punctualityRating?: number;

  @ApiProperty()
  @Prop({ type: Number, required: false, min: 1, max: 5 })
  professionalismRating?: number;

  @ApiProperty()
  @Prop({ type: Number, required: false, min: 1, max: 5 })
  communicationRating?: number;

  @ApiProperty()
  @Prop({ type: Number, required: false, min: 1, max: 5 })
  parcelHandlingRating?: number;

  // Tags for quick feedback
  @ApiProperty()
  @Prop({ type: [String], default: [] })
  positiveTags: string[]; // e.g., ['friendly', 'fast', 'careful']

  @ApiProperty()
  @Prop({ type: [String], default: [] })
  negativeTags: string[]; // e.g., ['late', 'rude', 'careless']

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isAnonymous: boolean;

  @ApiProperty()
  @Prop({ type: Boolean, default: true })
  isVisible: boolean; // admin can hide inappropriate reviews

  // Rider's response
  @ApiProperty()
  @Prop({ type: String, required: false, maxlength: 300 })
  riderResponse?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  riderRespondedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);
export type RatingDocument = Rating & Document;

// Indexes
RatingSchema.index({ deliveryRequest: 1 });
RatingSchema.index({ customer: 1 });
RatingSchema.index({ rider: 1 });
RatingSchema.index({ score: 1 });
RatingSchema.index({ createdAt: -1 });
