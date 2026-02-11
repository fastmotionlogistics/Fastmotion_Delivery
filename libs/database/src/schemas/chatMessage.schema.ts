import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

export enum ChatMessageSenderType {
  CUSTOMER = 'customer',
  RIDER = 'rider',
  SYSTEM = 'system',
}

export enum ChatMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  LOCATION = 'location',
  SYSTEM = 'system', // e.g. "Rider has arrived at pickup"
}

@Schema({
  collection: 'chat_messages',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class ChatMessage extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'DeliveryRequest', required: true, index: true })
  deliveryRequest: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: String, enum: ChatMessageSenderType, required: true })
  senderType: string;

  @ApiProperty({ description: 'User or Rider ObjectId' })
  @Prop({ type: Types.ObjectId, required: true })
  senderId: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: String, required: false })
  senderName?: string;

  @ApiProperty()
  @Prop({ type: String, enum: ChatMessageType, default: ChatMessageType.TEXT })
  messageType: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  content: string;

  @ApiProperty({ description: 'Image URL if messageType is image' })
  @Prop({ type: String, required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'Location coords if messageType is location' })
  @Prop({ type: Object, required: false })
  location?: { latitude: number; longitude: number };

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  readAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
export type ChatMessageDocument = ChatMessage & Document;

// Indexes
ChatMessageSchema.index({ deliveryRequest: 1, createdAt: 1 });
ChatMessageSchema.index({ deliveryRequest: 1, senderType: 1 });
