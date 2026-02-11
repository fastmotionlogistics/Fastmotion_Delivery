import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BusinessAddressDto {
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

class ContactPersonDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  email?: string;
}

export class UpdateBusinessDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  businessName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  businessRegistrationNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  businessType?: string;

  @ApiProperty({ type: BusinessAddressDto, required: false })
  @ValidateNested()
  @Type(() => BusinessAddressDto)
  @IsOptional()
  businessAddress?: BusinessAddressDto;

  @ApiProperty({ type: ContactPersonDto, required: false })
  @ValidateNested()
  @Type(() => ContactPersonDto)
  @IsOptional()
  contactPerson?: ContactPersonDto;
}
