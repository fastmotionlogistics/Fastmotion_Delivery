import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, IsOptional, IsObject, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class BusinessAddressDto {
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

class ContactPersonDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class CreateBusinessDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  businessRegistrationNumber?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  businessType: string; // 'restaurant', 'cafe', 'hotel', etc.

  @ApiProperty({ type: BusinessAddressDto })
  @ValidateNested()
  @Type(() => BusinessAddressDto)
  @IsNotEmpty()
  businessAddress: BusinessAddressDto;

  @ApiProperty({ type: ContactPersonDto })
  @ValidateNested()
  @Type(() => ContactPersonDto)
  @IsNotEmpty()
  contactPerson: ContactPersonDto;
}
