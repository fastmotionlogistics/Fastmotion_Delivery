import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateBankDetailsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bankCode: string;
}
