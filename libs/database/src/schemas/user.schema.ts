import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, SchemaTypes, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Gender, Role } from '../../../common/src/enums';
import { AbstractDocument } from './base.schema';

@Schema({
  collection: 'user',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },

  toObject: { virtuals: true, versionKey: false },
})
export class User extends AbstractDocument {
  @ApiProperty()
  @Prop({
    type: Number,
    enum: Role,
    default: Role.NORMAL_USER,
    maxlength: 20,
  })
  type?: number;

  @ApiProperty()
  @Prop({
    type: String,
    enum: Gender,
    maxlength: 20,
    required: false,
  })
  gender?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    required: false,
  })
  firstName?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 30,
    required: false,
    unique: true,
    sparse: true,
  })
  userName?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    required: false,
  })
  lastName?: string;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  dob?: Date;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 256,
    required: false,
    select: false,
  })
  passwordHash?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 256,
    required: false,
    select: false,
  })
  passwordSalt?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    unique: true,
    required: false,
    sparse: true,
  })
  email?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    required: false,
  })
  phone?: string;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
    select: false,
  })
  isFirstTime?: boolean;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
    select: false,
  })
  lastLoginDate?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  loginFailedDate?: Date;

  @ApiProperty()
  @Prop({
    type: Number,
    required: false,
    select: false,
  })
  loginFailedCount?: number;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isEmailConfirmed?: boolean;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isPhoneConfirmed?: boolean;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive?: boolean;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
    select: false,
  })
  emailConfirmationDate?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  emailConfirmationExpiryDate?: Date;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
    select: false,
  })
  phoneConfirmationDate?: Date;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    required: false,
  })
  emailConfirmationCode?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    required: false,
  })
  phoneConfirmationCode?: string;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
  })
  fcmToken?: string;

  @ApiProperty()
  @Prop({
    type: Number,
    default: 0,
    required: false,
    select: false,
  })
  resetPasswordCount?: number;

  @ApiProperty()
  @Prop({ type: String, required: false, select: false })
  resetPasswordOtp?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false, select: false })
  resetPasswordOtpExpiry?: Date;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isPhotoUpload?: boolean;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
  })
  profilePhotoUrl?: string;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isProfileUpdated?: boolean;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  emailNotification?: boolean;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: true,
  })
  mobileNotification?: boolean;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isSocialLogin?: boolean;

  @ApiProperty()
  @Prop({
    type: String,
    required: false,
    select: false,
  })
  deviceToken?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    required: false,
  })
  longitude?: string;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 64,
    required: false,
  })
  latitude?: string;

  // New fields for onboarding
  // @ApiProperty()
  // @Prop({
  //   type: SchemaTypes.ObjectId,
  //   ref: 'country',
  //   required: false,
  // })
  // country?: Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: Boolean,
    default: false,
  })
  isOnboardingComplete?: boolean;

  @ApiProperty()
  @Prop({
    type: String,
    maxlength: 16,
    required: false,
  })
  phoneConfirmationOtp?: string;

  @ApiProperty()
  @Prop({
    type: Date,
    required: false,
  })
  phoneConfirmationOtpExpiry?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
export type UserDocument = User & Document;

// Indexes for performance
// UserSchema.index({ email: 1 });
// UserSchema.index({ userName: 1 });
// UserSchema.index({ country: 1 });
// UserSchema.index({ favoriteTeam: 1 });
