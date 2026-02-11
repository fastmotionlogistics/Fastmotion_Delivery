import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateRatingDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  deliveryRequestId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;

  @ApiPropertyOptional({ example: 'Great service! Very professional.' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  punctualityRating?: number;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  professionalismRating?: number;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  parcelHandlingRating?: number;

  @ApiPropertyOptional({ example: ['friendly', 'fast', 'careful'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  positiveTags?: string[];

  @ApiPropertyOptional({ example: [] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  negativeTags?: string[];

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;
}

export class UpdateRatingDto {
  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  score?: number;

  @ApiPropertyOptional({ example: 'Updated comment' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}
