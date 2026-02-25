import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

@Schema({
  collection: 'saved_addresses',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class SavedAddress extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @ApiProperty({ example: 'Home' })
  @Prop({ type: String, required: true, maxlength: 50 })
  label: string;

  @ApiProperty({ example: '123 Victoria Island, Lagos' })
  @Prop({ type: String, required: true })
  address: string;

  @ApiProperty({ example: '6.4281' })
  @Prop({ type: String, required: true })
  latitude: string;

  @ApiProperty({ example: '3.4219' })
  @Prop({ type: String, required: true })
  longitude: string;

  @ApiProperty({ example: 'ChIJxyz...' })
  @Prop({ type: String, required: false })
  placeId?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SavedAddressSchema = SchemaFactory.createForClass(SavedAddress);
export type SavedAddressDocument = SavedAddress & Document;

SavedAddressSchema.index({ userId: 1 });
