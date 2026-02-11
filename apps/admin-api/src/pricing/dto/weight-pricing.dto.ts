import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { WeightPricingStatusEnum } from '@libs/database';

export class CreateWeightPricingDto {
  @ApiProperty({ example: 'Light Parcel' })
  @IsString()
  name: string;

  @ApiProperty({ example: 0, description: 'Minimum weight in kg (inclusive)' })
  @IsNumber()
  @Min(0)
  minWeightKg: number;

  @ApiProperty({ example: 5, description: 'Maximum weight in kg (exclusive)' })
  @IsNumber()
  @Min(0)
  maxWeightKg: number;

  @ApiProperty({ example: 1.0, description: 'Price multiplier' })
  @IsNumber()
  @Min(0)
  priceMultiplier: number;

  @ApiPropertyOptional({ example: 0, description: 'Additional flat fee' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  additionalFee?: number;

  @ApiPropertyOptional({ example: 'Small items under 5kg' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 0, description: 'Sort order for display' })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateWeightPricingDto extends PartialType(CreateWeightPricingDto) {
  @ApiPropertyOptional({ enum: WeightPricingStatusEnum })
  @IsEnum(WeightPricingStatusEnum)
  @IsOptional()
  status?: WeightPricingStatusEnum;
}
