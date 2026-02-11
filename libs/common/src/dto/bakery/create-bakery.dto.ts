import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsObject,
  ValidateNested,
  IsNumber,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

class BakeryAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  state: string;

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
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  website?: string;
}

export class CreateBakeryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bakeryName: string;

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

  @ApiProperty({ type: BakeryAddressDto })
  @ValidateNested()
  @Type(() => BakeryAddressDto)
  @IsNotEmpty()
  address: BakeryAddressDto;

  @ApiProperty({ type: ContactInfoDto })
  @ValidateNested()
  @Type(() => ContactInfoDto)
  @IsNotEmpty()
  contactInfo: ContactInfoDto;

  // @ApiProperty({ required: false, default: 50 })
  // @IsNumber()
  // @IsOptional()
  // deliveryRadius?: number;

  // @ApiProperty({ required: false, default: 0 })
  // @IsNumber()
  // @IsOptional()
  // minimumOrderAmount?: number;
}
