import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  productRating: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  deliveryRating: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  review?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsOptional()
  photos?: string[];
}
