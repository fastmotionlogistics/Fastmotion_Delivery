import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { DeliveryStatusEnum } from '@libs/common';

export class AssignRiderDto {
  @ApiProperty({ description: 'Delivery request ID' })
  @IsString()
  @IsNotEmpty()
  deliveryId: string;

  @ApiProperty({ description: 'Rider ID to assign' })
  @IsString()
  @IsNotEmpty()
  riderId: string;

  @ApiPropertyOptional({ description: 'Reason for manual assignment' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class OverridePinDto {
  @ApiProperty({ description: 'Delivery request ID' })
  @IsString()
  @IsNotEmpty()
  deliveryId: string;

  @ApiProperty({ enum: ['pickup', 'delivery'], description: 'Type of PIN to override' })
  @IsEnum(['pickup', 'delivery'])
  pinType: 'pickup' | 'delivery';

  @ApiProperty({ description: 'Reason for PIN override' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ManualCompleteDto {
  @ApiProperty({ description: 'Delivery request ID' })
  @IsString()
  @IsNotEmpty()
  deliveryId: string;

  @ApiProperty({ description: 'Reason for manual completion' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ManualCancelDto {
  @ApiProperty({ description: 'Delivery request ID' })
  @IsString()
  @IsNotEmpty()
  deliveryId: string;

  @ApiProperty({ description: 'Reason for cancellation' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Whether to refund customer' })
  @IsOptional()
  issueRefund?: boolean;

  @ApiPropertyOptional({ description: 'Refund amount (if partial refund)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  refundAmount?: number;
}

export class AdjustPriceDto {
  @ApiProperty({ description: 'Delivery request ID' })
  @IsString()
  @IsNotEmpty()
  deliveryId: string;

  @ApiProperty({ description: 'New total price' })
  @IsNumber()
  @Min(0)
  newTotalPrice: number;

  @ApiProperty({ description: 'Reason for price adjustment' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UpdateDeliveryStatusDto {
  @ApiProperty({ description: 'Delivery request ID' })
  @IsString()
  @IsNotEmpty()
  deliveryId: string;

  @ApiProperty({ enum: DeliveryStatusEnum })
  @IsEnum(DeliveryStatusEnum)
  status: DeliveryStatusEnum;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class IssueRefundDto {
  @ApiProperty({ description: 'Delivery request ID' })
  @IsString()
  @IsNotEmpty()
  deliveryId: string;

  @ApiProperty({ description: 'Refund amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Reason for refund' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ enum: ['full', 'partial'] })
  @IsEnum(['full', 'partial'])
  @IsOptional()
  refundType?: 'full' | 'partial';
}

export class DeliveryFilterDto {
  @ApiPropertyOptional({ enum: DeliveryStatusEnum })
  @IsEnum(DeliveryStatusEnum)
  @IsOptional()
  status?: DeliveryStatusEnum;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  riderId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  limit?: number;
}
