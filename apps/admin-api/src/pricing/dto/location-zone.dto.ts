import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ZoneStatusEnum } from '@libs/database';

export class CoordinateDto {
  @ApiProperty({ example: 6.5244 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 3.3792 })
  @IsNumber()
  longitude: number;
}

export class CreateLocationZoneDto {
  @ApiProperty({ example: 'Lagos Island' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'LAGOS-ISLAND' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'Central Lagos Island delivery zone' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [CoordinateDto], description: 'Polygon boundary coordinates' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinateDto)
  @IsOptional()
  boundaries?: CoordinateDto[];

  @ApiPropertyOptional({ type: CoordinateDto, description: 'Center point of the zone' })
  @ValidateNested()
  @Type(() => CoordinateDto)
  @IsOptional()
  centerPoint?: CoordinateDto;

  @ApiPropertyOptional({ example: 5, description: 'Radius in km from center point' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  radiusKm?: number;

  @ApiProperty({ example: 1.5, description: 'Price multiplier for this zone' })
  @IsNumber()
  @Min(0)
  priceMultiplier: number;

  @ApiPropertyOptional({ example: 500, description: 'Base fee for this zone' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  baseFee?: number;

  @ApiPropertyOptional({ example: 50, description: 'Price per km in this zone' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  pricePerKm?: number;

  @ApiPropertyOptional({ example: 1, description: 'Priority for zone matching' })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  allowInterZoneDelivery?: boolean;

  @ApiPropertyOptional({ description: 'IDs of linked zones for inter-zone delivery' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  linkedZones?: string[];
}

export class UpdateLocationZoneDto extends PartialType(CreateLocationZoneDto) {
  @ApiPropertyOptional({ enum: ZoneStatusEnum })
  @IsEnum(ZoneStatusEnum)
  @IsOptional()
  status?: ZoneStatusEnum;
}
