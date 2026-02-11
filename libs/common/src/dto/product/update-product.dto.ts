import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, IsBoolean, Min } from 'class-validator';

export class UpdateProductDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  tags?: string[];

  // @ApiProperty({ required: false })
  // @IsNumber()
  // @Min(0)
  // @IsOptional()
  // price?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  unit?: string;

  // @ApiProperty({ required: false })
  // @IsNumber()
  // @Min(1)
  // @IsOptional()
  // minimumOrderQuantity?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maximumDailyCapacity?: number;

  // @ApiProperty({ required: false })
  // @IsNumber()
  // @IsOptional()
  // preparationTimeHours?: number;

  // @ApiProperty({ type: [String], required: false })
  // @IsArray()
  // @IsOptional()
  // ingredients?: string[];

  // @ApiProperty({ type: [String], required: false })
  // @IsArray()
  // @IsOptional()
  // allergens?: string[];

  // @ApiProperty({ required: false })
  // @IsOptional()
  // nutritionalInfo?: {
  //   calories?: number;
  //   protein?: number;
  //   carbs?: number;
  //   fat?: number;
  // };

  // @ApiProperty({ required: false })
  // @IsBoolean()
  // @IsOptional()
  // isAvailable?: boolean;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  availableDays?: string[];

  // @ApiProperty({ required: false })
  // @IsString()
  // @IsOptional()
  // status?: string;
}
