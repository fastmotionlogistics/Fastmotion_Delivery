import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryTypeEnum, ParcelSizeEnum } from '@libs/common';

export class LocationDto {
  @ApiProperty({ example: '123 Main Street, Lagos' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: '6.5244' })
  @IsString()
  @IsNotEmpty()
  latitude: string;

  @ApiProperty({ example: '3.3792' })
  @IsString()
  @IsNotEmpty()
  longitude: string;

  @ApiPropertyOptional({ example: 'Near the big church' })
  @IsString()
  @IsOptional()
  landmark?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'Ring the bell twice' })
  @IsString()
  @IsOptional()
  additionalNotes?: string;
}

export class ParcelDto {
  @ApiProperty({ example: 'Documents and small electronics' })
  @IsString()
  @IsOptional()
  description: string;

  @ApiPropertyOptional({ enum: ParcelSizeEnum, example: ParcelSizeEnum.SMALL })
  @IsEnum(ParcelSizeEnum)
  @IsOptional()
  size?: ParcelSizeEnum;

  @ApiPropertyOptional({ example: 2.5, description: 'Weight in kg (optional, not used for pricing)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isFragile?: boolean;

  @ApiPropertyOptional({ example: 'Electronics' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 50000, description: 'Declared value for insurance purposes' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  declaredValue?: number;

  @ApiPropertyOptional({ example: ['fragile', 'keep_upright'], description: 'Special handling slugs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialHandling?: string[];
}

export class CreateDeliveryRequestDto {
  @ApiProperty({ enum: DeliveryTypeEnum, example: DeliveryTypeEnum.QUICK })
  @IsEnum(DeliveryTypeEnum)
  @IsNotEmpty()
  deliveryType: DeliveryTypeEnum;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  pickupLocation: LocationDto;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  dropoffLocation: LocationDto;

  @ApiProperty({ type: ParcelDto })
  @ValidateNested()
  @Type(() => ParcelDto)
  parcelDetails: ParcelDto;

  @ApiPropertyOptional({ example: '2024-12-25T10:00:00Z' })
  @IsDateString()
  @IsOptional()
  scheduledPickupTime?: string;

  @ApiPropertyOptional({ example: 'SAVE20' })
  @IsString()
  @IsOptional()
  couponCode?: string;

  @ApiPropertyOptional({
    example: 'wallet',
    description: 'Payment method: wallet, card, bank_transfer, or pay_at_pickup',
  })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({
    example: 'PAY_ref_123456',
    description:
      'Required for scheduled deliveries. Payment must be completed before scheduling is confirmed (PRD 7.2)',
  })
  @IsString()
  @IsOptional()
  paymentReference?: string;

  @ApiPropertyOptional({
    example: 12.5,
    description:
      'Estimated distance in km from the client (Google Maps Directions API). ' +
      'If provided, the server will use this instead of Haversine calculation.',
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedDistance?: number;

  @ApiPropertyOptional({
    example: 35,
    description:
      'Estimated duration in minutes from the client (Google Maps Directions API). ' +
      'If provided, the server will use this instead of its own estimate.',
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedDuration?: number;
}
