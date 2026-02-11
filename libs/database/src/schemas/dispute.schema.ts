import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';
import { DisputeStatusEnum, DisputeReasonEnum } from '../../../common/src/enums/delivery.enum';

// Embedded schema for dispute messages/comments
@Schema({ _id: false })
export class DisputeMessage {
  @Prop({ type: Types.ObjectId, required: true })
  senderId: Types.ObjectId;

  @Prop({ type: String, required: true })
  senderType: string; // 'customer' | 'rider' | 'admin'

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

@Schema({
  collection: 'disputes',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class Dispute extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: String, required: true, unique: true })
  ticketNumber: string;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'DeliveryRequest', required: true })
  deliveryRequest: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customer: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Rider', required: false })
  rider?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: String,
    enum: DisputeReasonEnum,
    required: true,
  })
  reason: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  description: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: DisputeStatusEnum,
    default: DisputeStatusEnum.OPEN,
  })
  status: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  priority?: string; // 'low' | 'medium' | 'high' | 'urgent'

  // Evidence/Attachments
  @ApiProperty()
  @Prop({ type: [String], default: [] })
  attachments: string[];

  // Communication history
  @ApiProperty()
  @Prop({ type: [DisputeMessage], default: [] })
  messages: DisputeMessage[];

  // Resolution
  @ApiProperty()
  @Prop({ type: String, required: false })
  resolution?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  resolvedAt?: Date;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  resolvedBy?: Types.ObjectId;

  // Refund related
  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  refundRequested: boolean;

  @ApiProperty()
  @Prop({ type: Number, required: false })
  refundAmount?: number;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  refundApproved: boolean;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Payment', required: false })
  refundPayment?: Types.ObjectId;

  // Assignment
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  assignedTo?: Types.ObjectId; // admin handling the dispute

  @ApiProperty()
  @Prop({ type: Date, required: false })
  assignedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DisputeSchema = SchemaFactory.createForClass(Dispute);
export type DisputeDocument = Dispute & Document;

// Indexes
DisputeSchema.index({ ticketNumber: 1 });
DisputeSchema.index({ deliveryRequest: 1 });
DisputeSchema.index({ customer: 1 });
DisputeSchema.index({ rider: 1 });
DisputeSchema.index({ status: 1 });
DisputeSchema.index({ reason: 1 });
DisputeSchema.index({ createdAt: -1 });
DisputeSchema.index({ assignedTo: 1 });
