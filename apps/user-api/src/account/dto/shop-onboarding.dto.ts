import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsObject, IsOptional, IsArray, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

class DeliveryAddressDto {
  @ApiProperty({ description: 'Label for this address (e.g., "Main Shop", "Warehouse")' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ description: 'Geographic coordinates' })
  @IsObject()
  @IsOptional()
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export class CompleteShopOnboardingDto {
  @ApiProperty({ description: 'Selected delivery zone ID' })
  @IsMongoId()
  @IsNotEmpty()
  deliveryZoneId: string;

  @ApiProperty({ description: 'Preferred delivery time window (e.g., "7:00-8:00 AM")' })
  @IsString()
  @IsNotEmpty()
  preferredDeliveryTime: string;

  @ApiProperty({ description: 'Primary delivery address' })
  @IsObject()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  primaryAddress: DeliveryAddressDto;

  @ApiProperty({ description: 'Alternative delivery addresses', type: [DeliveryAddressDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeliveryAddressDto)
  alternativeAddresses?: DeliveryAddressDto[];

  @ApiProperty({ description: 'Special delivery instructions' })
  @IsString()
  @IsOptional()
  deliveryInstructions?: string;
}
