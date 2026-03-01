import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Gender, VehicleTypeEnum } from '@libs/common';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  lastName?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsDateString()
  @IsOptional()
  dob?: string;

  @ApiPropertyOptional({ example: '123 Main Street, Lagos' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Lagos State' })
  @IsString()
  @IsOptional()
  state?: string;
}

export class UpdateVehicleDto {
  @ApiPropertyOptional({ enum: VehicleTypeEnum, example: VehicleTypeEnum.MOTORCYCLE })
  @IsEnum(VehicleTypeEnum)
  @IsOptional()
  vehicleType?: VehicleTypeEnum;

  @ApiPropertyOptional({ example: 'ABC-123-XY' })
  @IsString()
  @IsOptional()
  vehiclePlateNumber?: string;

  @ApiPropertyOptional({ example: 'Honda CBR 250' })
  @IsString()
  @IsOptional()
  vehicleModel?: string;

  @ApiPropertyOptional({ example: 'Red' })
  @IsString()
  @IsOptional()
  vehicleColor?: string;
}

export class UploadDocumentDto {
  @ApiProperty({ example: 'drivers_license' })
  @IsString()
  documentType: string; // 'drivers_license' | 'national_id' | 'vehicle_registration' | 'vehicle_insurance'

  @ApiProperty({ example: 'https://cloudinary.com/document.jpg' })
  @IsString()
  documentUrl: string;
}

export class UpdateBankDetailsDto {
  @ApiProperty({ example: 'GTBank' })
  @IsString()
  bankName: string;

  @ApiProperty({ example: '058' })
  @IsString()
  bankCode: string;

  @ApiProperty({ example: '0123456789' })
  @IsString()
  bankAccountNumber: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  bankAccountName?: string;
}

export class UpdateLocationDto {
  @ApiProperty({ example: '6.5244' })
  @IsString()
  latitude: string;

  @ApiProperty({ example: '3.3792' })
  @IsString()
  longitude: string;
}

export class UpdateFcmTokenDto {
  @ApiProperty({ example: 'fcm_token_here' })
  @IsString()
  fcmToken: string;
}
