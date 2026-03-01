import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsBoolean, MaxLength } from 'class-validator';
import { DisputeStatusEnum } from '@libs/common';

export class UpdateDisputeStatusDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  disputeId: string;

  @ApiProperty({ enum: DisputeStatusEnum })
  @IsEnum(DisputeStatusEnum)
  @IsNotEmpty()
  status: DisputeStatusEnum;

  @ApiPropertyOptional({ example: 'After review, we have determined the claim is valid.' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  resolution?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  refundApproved?: boolean;
}

export class AddAdminMessageDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  disputeId: string;

  @ApiProperty({ example: 'We are looking into this issue. Please provide more details.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional({ example: ['https://example.com/evidence.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}

export class AssignDisputeDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  disputeId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012', description: 'Admin user ID to assign' })
  @IsString()
  @IsNotEmpty()
  adminId: string;
}
