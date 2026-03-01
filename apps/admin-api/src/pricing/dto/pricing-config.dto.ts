import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString, Min, Max } from 'class-validator';

export class CreatePricingConfigDto {
  @ApiPropertyOptional({ example: 'NGN' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: '₦' })
  @IsString()
  @IsOptional()
  currencySymbol?: string;

  @ApiProperty({ example: 500, description: 'Base delivery fee' })
  @IsNumber()
  @Min(0)
  baseDeliveryFee: number;

  @ApiProperty({ example: 50, description: 'Price per kilometer' })
  @IsNumber()
  @Min(0)
  pricePerKm: number;

  @ApiPropertyOptional({ example: 10, description: 'Price per minute' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  pricePerMinute?: number;

  @ApiProperty({ example: 500, description: 'Minimum delivery fee' })
  @IsNumber()
  @Min(0)
  minimumDeliveryFee: number;

  @ApiPropertyOptional({ example: 50000, description: 'Maximum delivery fee' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maximumDeliveryFee?: number;

  @ApiPropertyOptional({ example: 1.0, description: 'Quick delivery multiplier' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  quickDeliveryMultiplier?: number;

  @ApiPropertyOptional({ example: 0.9, description: 'Scheduled delivery multiplier' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  scheduledDeliveryMultiplier?: number;

  @ApiPropertyOptional({ example: 1.2, description: 'Inter-zone multiplier' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  interZoneMultiplier?: number;

  @ApiPropertyOptional({ example: 0.05, description: 'Service fee percentage (0.05 = 5%)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  serviceFeePercentage?: number;

  @ApiPropertyOptional({ example: 100, description: 'Minimum service fee' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minimumServiceFee?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Maximum service fee' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maximumServiceFee?: number;

  @ApiPropertyOptional({ example: 0.01, description: 'Parcel protection percentage' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  parcelProtectionPercentage?: number;

  @ApiPropertyOptional({ example: 200, description: 'Cancellation fee before rider accept' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cancellationFeeBeforeAccept?: number;

  @ApiPropertyOptional({ example: 500, description: 'Cancellation fee after rider accept' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cancellationFeeAfterAccept?: number;

  @ApiPropertyOptional({ example: 0.5, description: 'Cancellation fee after pickup (percentage)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  cancellationFeeAfterPickupPercentage?: number;

  @ApiPropertyOptional({ example: 0.80, description: 'Rider commission percentage (0.80 = 80%)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  riderCommissionPercentage?: number;

  @ApiPropertyOptional({ example: 100, description: 'Minimum amount rider receives per delivery' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minimumRiderPayout?: number;

  @ApiPropertyOptional({ example: 100, description: 'Rescheduling fee' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  reschedulingFee?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  effectiveUntil?: string;
}

export class UpdatePricingConfigDto extends PartialType(CreatePricingConfigDto) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
