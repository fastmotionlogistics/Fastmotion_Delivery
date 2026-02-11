import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  MinLength,
  MaxLength,
  IsLatitude,
  IsLongitude,
  Matches,
  IsMongoId,
  IsEmail,
  IsPhoneNumber,
  IsNotEmpty,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class CompleteShopSetupDto {
  @ApiProperty({
    example: "Joe's Bakery Shop",
    description: 'Name of the business',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  shopName: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of business owner or manager',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  ownerName: string;

  @ApiProperty({
    example: '123 Main Street, Ikeja, Lagos',
    description: 'Business physical address',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(256)
  shopAddress: string;

  @ApiPropertyOptional({
    required: false,
  })
  @IsOptional()
  @IsString()
  businessLogo?: string;

  @ApiPropertyOptional({
    example: '6.5244',
    description: 'Latitude of business location',
    required: false,
  })
  @IsOptional()
  @IsString()
  latitude?: string;

  @ApiPropertyOptional({
    example: '3.3792',
    description: 'Longitude of business location',
    required: false,
  })
  @IsOptional()
  @IsString()
  longitude?: string;

  @ApiProperty({
    example: '+2348012345678',
    description: 'Phone number with country code',
  })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in valid international format (E.164)',
  })
  businessPhoneNumber: string;

  @ApiProperty({
    example: 'shop',
    description: 'Type of business',
    required: true,
    enum: ['shop', 'restaurant', 'cafe', 'hotel', 'other'],
  })
  @IsNotEmpty()
  @IsIn(['shop', 'restaurant', 'cafe', 'hotel', 'other'])
  businessType: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Business registration number',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  businessRegistrationNumber?: string;

  // @ApiProperty({
  //   example: ['456 Back Street, Ikeja', '789 Alternative Road, Yaba'],
  //   description: 'Additional delivery addresses',
  //   required: false,
  //   type: [String],
  // })
  // @IsOptional()
  // @IsArray()
  // @IsString({ each: true })
  // @Type(() => String)
  // alternativeAddresses?: string[];
}

export class UpdateShopProfileDto {
  @ApiProperty({
    example: "Joe's Bakery Shop",
    description: 'Name of the business',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  shopName?: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of business owner or manager',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  ownerName?: string;

  @ApiProperty({
    example: '123 Main Street, Ikeja, Lagos',
    description: 'Business physical address',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(256)
  shopAddress?: string;

  @ApiProperty({
    example: '6.5244',
    description: 'Latitude of business location',
    required: false,
  })
  @IsOptional()
  @IsString()
  latitude?: string;

  @ApiProperty({
    example: '3.3792',
    description: 'Longitude of business location',
    required: false,
  })
  @IsOptional()
  @IsString()
  longitude?: string;

  @ApiProperty({
    example: '671234567890123456789012',
    description: 'Delivery zone ID for the business',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  deliveryZone?: Types.ObjectId;

  @ApiProperty({
    example: 'shop',
    description: 'Type of business',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  businessType?: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Business registration number',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  businessRegistrationNumber?: string;

  @ApiProperty({
    example: [
      {
        label: 'Office',
        street: '456 Back Street',
        city: 'Lagos',
        state: 'Lagos',
        isDefault: true,
      },
    ],
    description: 'Delivery addresses',
    required: false,
  })
  @IsOptional()
  @IsArray()
  deliveryAddresses?: Array<{
    label: string;
    street: string;
    city: string;
    state: string;
    isDefault: boolean;
  }>;

  @ApiProperty({
    example: { name: 'Jane Doe', phone: '+2341234567890', email: 'jane@example.com' },
    description: 'Updated contact person information',
    required: false,
  })
  @IsOptional()
  contactPerson?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}
