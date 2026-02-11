import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export * from './MonnifyTrx.dto';
export * from './MonnifyPayment.dto';

// Bread Delivery App DTOs
export * from './business';
export * from './bakery';
export * from './product';
export * from './order';
export * from './review';

export class updateFCMDto {
  @ApiProperty({ required: false })
  @IsString()
  fcmToken?: string;
}
