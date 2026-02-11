import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

export enum ZoneStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ _id: false })
export class ZoneCoordinate {
  @ApiProperty({ example: 6.5244 })
  @Prop({ type: Number, required: true })
  latitude: number;

  @ApiProperty({ example: 3.3792 })
  @Prop({ type: Number, required: true })
  longitude: number;
}

export const ZoneCoordinateSchema = SchemaFactory.createForClass(ZoneCoordinate);

@Schema({
  collection: 'location_zones',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class LocationZone extends AbstractDocument {
  @ApiProperty({ example: 'Lagos Island' })
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty({ example: 'LAGOS-ISLAND' })
  @Prop({ type: String, required: true, unique: true })
  code: string;

  @ApiProperty({ example: 'Central Lagos Island delivery zone' })
  @Prop({ type: String, required: false })
  description?: string;

  @ApiProperty({ description: 'Polygon coordinates defining the zone boundary' })
  @Prop({ type: [ZoneCoordinateSchema], required: false })
  boundaries?: ZoneCoordinate[];

  @ApiProperty({ description: 'Center point of the zone' })
  @Prop({ type: ZoneCoordinateSchema, required: false })
  centerPoint?: ZoneCoordinate;

  @ApiProperty({ example: 5, description: 'Radius in kilometers from center point' })
  @Prop({ type: Number, required: false })
  radiusKm?: number;

  @ApiProperty({ example: 1.5, description: 'Price multiplier for this zone' })
  @Prop({ type: Number, required: true, default: 1.0 })
  priceMultiplier: number;

  @ApiProperty({ example: 500, description: 'Base delivery fee for this zone in smallest currency unit' })
  @Prop({ type: Number, required: false, default: 0 })
  baseFee?: number;

  @ApiProperty({ example: 50, description: 'Price per km in this zone' })
  @Prop({ type: Number, required: false })
  pricePerKm?: number;

  @ApiProperty({ example: 1, description: 'Priority for zone matching (higher = checked first)' })
  @Prop({ type: Number, default: 1 })
  priority: number;

  @ApiProperty({ enum: ZoneStatusEnum })
  @Prop({
    type: String,
    enum: ZoneStatusEnum,
    default: ZoneStatusEnum.ACTIVE,
  })
  status: string;

  @ApiProperty({ description: 'Whether zone-to-zone deliveries are allowed' })
  @Prop({ type: Boolean, default: true })
  allowInterZoneDelivery: boolean;

  @ApiProperty({ description: 'Zones that can deliver to/from this zone' })
  @Prop({ type: [{ type: Types.ObjectId, ref: 'LocationZone' }], default: [] })
  linkedZones?: Types.ObjectId[];

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  createdBy?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  updatedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const LocationZoneSchema = SchemaFactory.createForClass(LocationZone);
export type LocationZoneDocument = LocationZone & Document;

// Indexes
LocationZoneSchema.index({ code: 1 }, { unique: true });
LocationZoneSchema.index({ status: 1 });
LocationZoneSchema.index({ priority: -1 });
LocationZoneSchema.index({ 'centerPoint.latitude': 1, 'centerPoint.longitude': 1 });
