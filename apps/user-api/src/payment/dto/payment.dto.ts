import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { DeliveryPaymentMethodEnum } from '@libs/common';

export class InitiatePaymentDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  deliveryRequestId: string;

  @ApiProperty({ enum: DeliveryPaymentMethodEnum, example: DeliveryPaymentMethodEnum.WALLET })
  @IsEnum(DeliveryPaymentMethodEnum)
  @IsNotEmpty()
  paymentMethod: DeliveryPaymentMethodEnum;
}

export class FundWalletDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({ enum: ['card', 'bank_transfer'], example: 'card' })
  @IsString()
  @IsNotEmpty()
  fundingMethod: string;
}

export class VerifyPaymentDto {
  @ApiProperty({ example: 'PAY_ref_123456' })
  @IsString()
  @IsNotEmpty()
  reference: string;
}

export class WithdrawDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ example: 'GTBank' })
  @IsString()
  @IsOptional()
  bankName?: string;
}
