import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddContactAddressDto {
  @ApiProperty({
    description: 'Address string',
    example: '123 Main Street, City, Country',
  })
  @IsNotEmpty()
  @IsString()
  address: string;
}

export class SetDefaultAddressDto {
  @ApiProperty({
    description: 'ID of the address to set as default',
    example: '60d5ec9af682f271e4a28d5e',
  })
  @IsNotEmpty()
  @IsString()
  addressId: string;
}
export class UpdateContactAddressDto {
  @ApiProperty({
    description: 'ID of the address to set as default',
    example: '60d5ec9af682f271e4a28d5e',
  })
  @IsNotEmpty()
  @IsString()
  addressId: string;

  @ApiProperty({
    description: 'Address string',
    example: '123 Main Street, City, Country',
  })
  @IsNotEmpty()
  @IsString()
  address: string;
}
