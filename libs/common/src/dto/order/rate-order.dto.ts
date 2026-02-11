import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class RateOrderDto {
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
}
