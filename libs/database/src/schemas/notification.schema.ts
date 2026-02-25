import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

export enum NotificationChannel {
  FIREBASE = 'firebase',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
}

export enum NotificationRecipientType {
  USER = 'user',
  RIDER = 'rider',
  ADMIN = 'admin',
}

@Schema({
  collection: 'notifications',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class Notification extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, required: true, index: true })
  recipientId: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: String, enum: NotificationRecipientType, required: true })
  recipientType: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  title: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  body: string;

  @ApiProperty()
  @Prop({ type: Object, required: false })
  data?: Record<string, any>;

  @ApiProperty()
  @Prop({ type: [String], enum: NotificationChannel, default: [NotificationChannel.FIREBASE] })
  channels: string[];

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  readAt?: Date;

  @ApiProperty()
  @Prop({ type: String, required: false })
  email?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
export type NotificationDocument = Notification & Document;

NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, isRead: 1 });
