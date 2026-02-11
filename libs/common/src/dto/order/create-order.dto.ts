import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsEnum, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty()
  @IsNotEmpty()
  quantity: number;
}
class CoOrdinate {
  @ApiProperty()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty()
  @IsNotEmpty()
  longitude: number;
}
class DeliveryAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contactAddress: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @ApiPropertyOptional({ required: false, type: CoOrdinate })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoOrdinate)
  coordinates?: CoOrdinate;
}

export class CreateOrderDto {
  @ApiProperty({ type: DeliveryAddressDto })
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  @IsNotEmpty()
  deliveryAddress: DeliveryAddressDto;

  @ApiProperty({ enum: ['CARD', 'ACCOUNT_TRANSFER', 'USSD'] })
  @IsEnum(['CARD', 'ACCOUNT_TRANSFER', 'USSD'])
  @IsNotEmpty()
  paymentMethod: string;
}
