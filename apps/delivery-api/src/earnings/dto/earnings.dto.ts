import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';

export class WithdrawEarningsDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(100)
  amount: number;
}

export class EarningsFilterDto {
  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 'delivery_fee' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: 'available' })
  @IsString()
  @IsOptional()
  status?: string;
}
