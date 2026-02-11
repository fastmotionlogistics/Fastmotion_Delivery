import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from './base.schema';
import { SchemaTypes, Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ collection: 'refreshToken', timestamps: true })
export class RefreshToken extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 32,
    required: false,
  })
  token?: string;

  @ApiProperty()
  @Prop({
    type: Date,
    required: true,
  })
  expiresAt?: Date;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  revoked?: boolean;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive?: boolean;

  @ApiProperty()
  @Prop({
    type: String,
    // required: true,
  })
  ipAddress?: string;

  @ApiProperty()
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'user',
    required: false,
  })
  user?: Types.ObjectId; // Stores ObjectId referencing User
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
