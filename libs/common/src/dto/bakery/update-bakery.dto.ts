import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class BakeryAddressDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

class ContactInfoDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  website?: string;
}

class OperatingHoursDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  monday?: { open: string; close: string };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  tuesday?: { open: string; close: string };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  wednesday?: { open: string; close: string };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  thursday?: { open: string; close: string };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  friday?: { open: string; close: string };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  saturday?: { open: string; close: string };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  sunday?: { open: string; close: string };
}

export class UpdateBakeryDto {
  // @ApiProperty({ required: false })
  // @IsString()
  // @IsOptional()
  // bakeryName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  businessRegistrationNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  coverPhoto?: string;

  @ApiProperty({ type: BakeryAddressDto, required: false })
  @ValidateNested()
  @Type(() => BakeryAddressDto)
  @IsOptional()
  address?: BakeryAddressDto;

  @ApiProperty({ type: ContactInfoDto, required: false })
  @ValidateNested()
  @Type(() => ContactInfoDto)
  @IsOptional()
  contactInfo?: ContactInfoDto;

  // @ApiProperty({ required: false })
  // @IsNumber()
  // @IsOptional()
  // deliveryRadius?: number;

  // @ApiProperty({ type: OperatingHoursDto, required: false })
  // @ValidateNested()
  // @Type(() => OperatingHoursDto)
  // @IsOptional()
  // operatingHours?: OperatingHoursDto;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  minimumOrderAmount?: number;
}
