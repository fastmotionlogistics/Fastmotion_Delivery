import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsEnum, Min, Matches } from 'class-validator';
import { TimePricingStatusEnum, DayOfWeekEnum } from '@libs/database';

export class CreateTimePricingDto {
  @ApiProperty({ example: 'Rush Hour Morning' })
  @IsString()
  name: string;

  @ApiProperty({ example: '07:00', description: 'Start time in 24h format (HH:mm)' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty({ example: '09:00', description: 'End time in 24h format (HH:mm)' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;

  @ApiPropertyOptional({ enum: DayOfWeekEnum, isArray: true })
  @IsArray()
  @IsEnum(DayOfWeekEnum, { each: true })
  @IsOptional()
  daysOfWeek?: DayOfWeekEnum[];

  @ApiProperty({ example: 1.5, description: 'Price multiplier' })
  @IsNumber()
  @Min(0)
  priceMultiplier: number;

  @ApiPropertyOptional({ example: 0, description: 'Additional flat fee' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  additionalFee?: number;

  @ApiPropertyOptional({ example: 'Peak morning traffic hours' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isPeakPeriod?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isDeliveryAvailable?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Priority for overlapping time slots' })
  @IsNumber()
  @IsOptional()
  priority?: number;
}

export class UpdateTimePricingDto extends PartialType(CreateTimePricingDto) {
  @ApiPropertyOptional({ enum: TimePricingStatusEnum })
  @IsEnum(TimePricingStatusEnum)
  @IsOptional()
  status?: TimePricingStatusEnum;
}
