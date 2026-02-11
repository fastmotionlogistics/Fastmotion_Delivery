import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';
import {
  RiderStatusEnum,
  RiderVerificationStatusEnum,
  VehicleTypeEnum,
} from '../../../common/src/enums/delivery.enum';
import { Gender } from '../../../common/src/enums';

@Schema({
  collection: 'riders',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class Rider extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: String, required: true, maxlength: 64 })
  firstName: string;

  @ApiProperty()
  @Prop({ type: String, required: true, maxlength: 64 })
  lastName: string;

  @ApiProperty()
  @Prop({ type: String, required: true, unique: true, maxlength: 64 })
  email: string;

  @ApiProperty()
  @Prop({ type: String, required: true, unique: true, maxlength: 20 })
  phone: string;

  @ApiProperty()
  @Prop({ type: String, required: true, select: false })
  passwordHash: string;

  @ApiProperty()
  @Prop({ type: String, required: true, select: false })
  passwordSalt: string;

  @ApiProperty()
  @Prop({ type: String, enum: Gender, required: false })
  gender?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  dob?: Date;

  @ApiProperty()
  @Prop({ type: String, required: false })
  profilePhoto?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  address?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  city?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  state?: string;

  // Vehicle Information
  @ApiProperty()
  @Prop({ type: String, enum: VehicleTypeEnum, required: false })
  vehicleType?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  vehiclePlateNumber?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  vehicleModel?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  vehicleColor?: string;

  // Documents
  @ApiProperty()
  @Prop({ type: String, required: false })
  driversLicense?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  nationalId?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  vehicleRegistration?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  vehicleInsurance?: string;

  // Status
  @ApiProperty()
  @Prop({
    type: String,
    enum: RiderStatusEnum,
    default: RiderStatusEnum.OFFLINE,
  })
  status: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: RiderVerificationStatusEnum,
    default: RiderVerificationStatusEnum.PENDING,
  })
  verificationStatus: string;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isEmailConfirmed: boolean;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isPhoneConfirmed: boolean;

  @ApiProperty()
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isOnline: boolean;

  // Location
  @ApiProperty()
  @Prop({ type: String, required: false })
  currentLatitude?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  currentLongitude?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  lastLocationUpdate?: Date;

  // Ratings & Stats
  @ApiProperty()
  @Prop({ type: Number, default: 0 })
  totalDeliveries: number;

  @ApiProperty()
  @Prop({ type: Number, default: 0 })
  totalEarnings: number;

  @ApiProperty()
  @Prop({ type: Number, default: 0, min: 0, max: 5 })
  averageRating: number;

  @ApiProperty()
  @Prop({ type: Number, default: 0 })
  totalRatings: number;

  // Auth & Security
  @ApiProperty()
  @Prop({ type: String, required: false })
  fcmToken?: string;

  @ApiProperty()
  @Prop({ type: String, required: false, select: false })
  emailConfirmationCode?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  emailConfirmationExpiryDate?: Date;

  @ApiProperty()
  @Prop({ type: String, required: false, select: false })
  phoneConfirmationOtp?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  phoneConfirmationOtpExpiry?: Date;

  @ApiProperty()
  @Prop({ type: String, required: false, select: false })
  resetPasswordOtp?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false, select: false })
  resetPasswordOtpExpiry?: Date;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  lastLoginDate?: Date;

  // Bank Details for Earnings
  @ApiProperty()
  @Prop({ type: String, required: false })
  bankName?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  bankAccountNumber?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  bankAccountName?: string;

  // Device Binding (security - account tied to device)
  @ApiProperty({ description: 'Unique device identifier for account binding' })
  @Prop({ type: String, required: false, select: false })
  boundDeviceId?: string;

  @ApiProperty({ description: 'Device model/name for reference' })
  @Prop({ type: String, required: false })
  boundDeviceModel?: string;

  @ApiProperty({ description: 'When device was first bound' })
  @Prop({ type: Date, required: false })
  deviceBoundAt?: Date;

  @ApiProperty({ description: 'Whether device binding is enforced' })
  @Prop({ type: Boolean, default: true })
  enforceDeviceBinding: boolean;

  // Bike/Vehicle Binding (security - account tied to specific vehicle)
  @ApiProperty({ description: 'Whether this account is bound to a specific vehicle' })
  @Prop({ type: Boolean, default: false })
  isVehicleBound: boolean;

  @ApiProperty({ description: 'Unique identifier for the bound vehicle' })
  @Prop({ type: String, required: false })
  boundVehicleId?: string;

  @ApiProperty({ description: 'When vehicle was first bound' })
  @Prop({ type: Date, required: false })
  vehicleBoundAt?: Date;

  // Zone assignment (admin can assign riders to specific zones)
  @ApiProperty()
  @Prop({ type: [{ type: Types.ObjectId, ref: 'LocationZone' }], default: [] })
  assignedZones?: Types.ObjectId[];

  @ApiProperty({ description: 'Whether rider can accept deliveries outside assigned zones' })
  @Prop({ type: Boolean, default: true })
  canAcceptOutsideZone: boolean;

  // Contact visibility
  @ApiProperty({ description: 'Whether rider phone can be shown to customers' })
  @Prop({ type: Boolean, default: false })
  allowContactSharing: boolean;

  // Suspension/Deactivation
  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  isSuspended: boolean;

  @ApiProperty()
  @Prop({ type: String, required: false })
  suspensionReason?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  suspendedAt?: Date;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  suspendedBy?: Types.ObjectId;

  // Capacity limits
  @ApiProperty({ description: 'Maximum concurrent deliveries allowed' })
  @Prop({ type: Number, default: 1 })
  maxConcurrentDeliveries: number;

  @ApiProperty({ description: 'Current active deliveries count' })
  @Prop({ type: Number, default: 0 })
  currentDeliveryCount: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RiderSchema = SchemaFactory.createForClass(Rider);
export type RiderDocument = Rider & Document;

// Indexes
RiderSchema.index({ email: 1 });
RiderSchema.index({ phone: 1 });
RiderSchema.index({ status: 1 });
RiderSchema.index({ verificationStatus: 1 });
RiderSchema.index({ isOnline: 1 });
RiderSchema.index({ currentLatitude: 1, currentLongitude: 1 });
