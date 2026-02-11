import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { DeliveryStatusEnum } from '@libs/common';

export class AcceptDeliveryDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  deliveryRequestId: string;
}

export class RejectDeliveryDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  deliveryRequestId: string;

  @ApiPropertyOptional({ example: 'Too far from my location' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateDeliveryStatusDto {
  @ApiProperty({ enum: DeliveryStatusEnum, example: DeliveryStatusEnum.PICKED_UP })
  @IsEnum(DeliveryStatusEnum)
  @IsNotEmpty()
  status: DeliveryStatusEnum;
}

export class VerifyPickupPinDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @IsNotEmpty()
  pin: string;
}

export class VerifyDeliveryPinDto {
  @ApiProperty({ example: '5678' })
  @IsString()
  @IsNotEmpty()
  pin: string;
}

export class UpdateRiderLocationDto {
  @ApiProperty({ example: '6.5244' })
  @IsString()
  @IsNotEmpty()
  latitude: string;

  @ApiProperty({ example: '3.3792' })
  @IsString()
  @IsNotEmpty()
  longitude: string;
}
