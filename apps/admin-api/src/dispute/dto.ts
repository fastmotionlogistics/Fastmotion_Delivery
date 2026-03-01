import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNotEmpty, IsArray, IsBoolean, IsNumber, MaxLength } from 'class-validator';
import { DisputeStatusEnum } from '@libs/common';

export class UpdateDisputeStatusDto {
  @ApiProperty({ enum: DisputeStatusEnum })
  @IsEnum(DisputeStatusEnum)
  @IsNotEmpty()
  status: DisputeStatusEnum;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  resolution?: string;
}

export class AdminDisputeMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}

export class ApproveRefundDto {
  @ApiProperty()
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  amount?: number; // partial refund amount

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

export class DisputeFilterDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;
}
