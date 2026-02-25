import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

export class CreateItemCategoryDto {
  @ApiProperty({ example: 'electronics' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'Electronics' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '📱' })
  @IsString()
  @IsOptional()
  emoji?: string;

  @ApiPropertyOptional({ example: 'Phones, laptops, gadgets' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1.5 })
  @IsNumber()
  @Min(0)
  priceMultiplier: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  additionalFee?: number;

  @ApiPropertyOptional({ example: '+50%' })
  @IsString()
  @IsOptional()
  priceLabel?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateItemCategoryDto extends PartialType(CreateItemCategoryDto) {
  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateSpecialHandlingDto {
  @ApiProperty({ example: 'fragile' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'Fragile' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Handle with extra care' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 300 })
  @IsNumber()
  @Min(0)
  additionalFee: number;

  @ApiPropertyOptional({ example: 1.0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  priceMultiplier?: number;

  @ApiPropertyOptional({ example: '+₦300' })
  @IsString()
  @IsOptional()
  priceLabel?: string;

  @ApiPropertyOptional({ example: '#FEE2E2' })
  @IsString()
  @IsOptional()
  bgColor?: string;

  @ApiPropertyOptional({ example: '#DC2626' })
  @IsString()
  @IsOptional()
  textColor?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateSpecialHandlingDto extends PartialType(CreateSpecialHandlingDto) {
  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsString()
  @IsOptional()
  status?: string;
}
