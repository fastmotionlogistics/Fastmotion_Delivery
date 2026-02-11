import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { DisputeReasonEnum } from '@libs/common';

export class CreateDisputeDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  deliveryRequestId: string;

  @ApiProperty({ enum: DisputeReasonEnum, example: DisputeReasonEnum.DELIVERY_NOT_COMPLETED })
  @IsEnum(DisputeReasonEnum)
  @IsNotEmpty()
  reason: DisputeReasonEnum;

  @ApiProperty({ example: 'The rider never arrived at my location despite payment being confirmed.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @ApiPropertyOptional({ example: ['https://example.com/image1.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  requestRefund?: boolean;
}

export class AddDisputeMessageDto {
  @ApiProperty({ example: 'I have additional information about this issue.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message: string;

  @ApiPropertyOptional({ example: ['https://example.com/evidence.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}

export class UpdateDisputeDto {
  @ApiPropertyOptional({ example: 'Updated description with more details.' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: ['https://example.com/new-evidence.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}
