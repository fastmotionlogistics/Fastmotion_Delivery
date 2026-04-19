import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

@Schema({ timestamps: true })
export class FaqItem {
  @ApiProperty()
  @Prop({ type: String, required: true })
  question: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  answer: string;

  @ApiProperty()
  @Prop({ type: Number, default: 0 })
  order: number;
}

export const FaqItemSchema = SchemaFactory.createForClass(FaqItem);

@Schema({
  collection: 'app_content',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class AppContent extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: String, default: '' })
  termsAndConditions: string;

  @ApiProperty()
  @Prop({ type: String, default: '' })
  privacyPolicy: string;

  @ApiProperty()
  @Prop({ type: String, default: '' })
  contactEmail: string;

  @ApiProperty()
  @Prop({ type: String, default: '' })
  contactPhone: string;

  @ApiProperty({ type: [FaqItem] })
  @Prop({ type: [FaqItemSchema], default: [] })
  faqs: FaqItem[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const AppContentSchema = SchemaFactory.createForClass(AppContent);
export type AppContentDocument = AppContent & Document;
