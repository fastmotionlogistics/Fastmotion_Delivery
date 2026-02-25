import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateSavedAddressDto {
  @ApiProperty({ example: 'Home' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  label: string;

  @ApiProperty({ example: '123 Victoria Island, Lagos' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: '6.4281' })
  @IsString()
  @IsNotEmpty()
  latitude: string;

  @ApiProperty({ example: '3.4219' })
  @IsString()
  @IsNotEmpty()
  longitude: string;

  @ApiPropertyOptional({ example: 'ChIJxyz...' })
  @IsString()
  @IsOptional()
  placeId?: string;
}

export class UpdateSavedAddressDto {
  @ApiPropertyOptional({ example: 'Home' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  label?: string;

  @ApiPropertyOptional({ example: '123 Victoria Island, Lagos' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: '6.4281' })
  @IsString()
  @IsOptional()
  latitude?: string;

  @ApiPropertyOptional({ example: '3.4219' })
  @IsString()
  @IsOptional()
  longitude?: string;

  @ApiPropertyOptional({ example: 'ChIJxyz...' })
  @IsString()
  @IsOptional()
  placeId?: string;
}
