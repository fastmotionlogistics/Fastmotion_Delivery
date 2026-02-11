import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { DeliveryPaymentMethodEnum } from '@libs/common';

export class RescheduleDeliveryDto {
  @ApiProperty({ example: '2024-12-26T10:00:00Z', description: 'New scheduled pickup time' })
  @IsDateString()
  @IsNotEmpty()
  newScheduledPickupTime: string;

  @ApiPropertyOptional({ description: 'Reason for rescheduling' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class CancelDeliveryDto {
  @ApiProperty({ example: 'Changed my mind', description: 'Reason for cancellation' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class VerifyPinDto {
  @ApiProperty({ example: '1234', description: 'PIN to verify' })
  @IsString()
  @IsNotEmpty()
  pin: string;
}

// For quick delivery - payment at pickup
export class InitiatePickupPaymentDto {
  @ApiProperty({ enum: DeliveryPaymentMethodEnum, description: 'Payment method' })
  @IsEnum(DeliveryPaymentMethodEnum)
  @IsNotEmpty()
  paymentMethod: DeliveryPaymentMethodEnum;

  @ApiPropertyOptional({ description: 'Card token if paying by card' })
  @IsString()
  @IsOptional()
  cardToken?: string;
}

export class ConfirmPaymentDto {
  @ApiProperty({ description: 'Payment reference from payment provider' })
  @IsString()
  @IsNotEmpty()
  paymentReference: string;

  @ApiPropertyOptional({ description: 'Payment provider (e.g., paystack, flutterwave)' })
  @IsString()
  @IsOptional()
  paymentProvider?: string;
}

// Additional payment for rescheduling (if price increased)
export class ConfirmReschedulePaymentDto {
  @ApiProperty({ description: 'Payment reference for additional amount' })
  @IsString()
  @IsNotEmpty()
  paymentReference: string;

  @ApiPropertyOptional({ description: 'Payment provider' })
  @IsString()
  @IsOptional()
  paymentProvider?: string;
}
