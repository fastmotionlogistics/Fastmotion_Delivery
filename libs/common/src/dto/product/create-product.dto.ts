import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  IsMongoId,
  IsEnum,
  IsUrl,
} from 'class-validator';
import { ProductUnitEnum } from '@libs/common';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty()
  @IsString()
  @IsUrl()
  @IsNotEmpty()
  thumbnail: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @ApiProperty({ enum: ProductUnitEnum })
  @IsEnum(ProductUnitEnum)
  @IsNotEmpty()
  unit: ProductUnitEnum; // 'piece', 'kg', 'dozen', 'pack'

  // @ApiProperty({ default: 1 })
  // @IsNumber()
  // @Min(1)
  // @IsOptional()
  // minimumOrderQuantity?: number;

  @ApiProperty({ default: 1000 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maximumDailyCapacity?: number;

  // @ApiProperty({ default: 12 })
  // @IsNumber()
  // @IsOptional()
  // preparationTimeHours?: number;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  ingredients?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  allergens?: string[];

  // @ApiProperty({ required: false })
  // @IsOptional()
  // nutritionalInfo?: {
  //   calories?: number;
  //   protein?: number;
  //   carbs?: number;
  //   fat?: number;
  // };

  // @ApiProperty({ type: [String], required: false })
  // @IsArray()
  // @IsOptional()
  // availableDays?: string[];
}
