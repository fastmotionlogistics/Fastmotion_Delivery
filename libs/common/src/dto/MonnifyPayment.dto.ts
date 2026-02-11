import { ApiProperty } from '@nestjs/swagger';
// import { AutoMap } from '@automapper/classes';
import { Exclude, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsDecimal,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsStrongPassword,
} from 'class-validator';
import { MonnifyBaseResponseDto } from './MonnifyTrx.dto';

class MonnifyPaymentDto {
  @ApiProperty({})
  @IsString()
  transactionReference!: string;

  @ApiProperty({})
  @IsString()
  paymentReference!: string;

  @ApiProperty({})
  @IsString()
  merchantName!: string;

  @ApiProperty({})
  @IsString()
  apiKey!: string;

  @ApiProperty({})
  @IsString()
  checkoutUrl!: string;

  @ApiProperty({
    isArray: true,
  })
  @IsArray()
  @IsNotEmpty()
  enabledPaymentMethod!: string[];
}
class MonnifyBankPaymentDto {
  @ApiProperty({})
  @IsString()
  accountNumber!: string;

  @ApiProperty({})
  @IsString()
  accountName!: string;

  @ApiProperty({})
  @IsString()
  bankName!: string;

  @ApiProperty({})
  @IsString()
  bankCode!: string;

  @ApiProperty({})
  @IsString()
  ussdPayment!: string;

  @Exclude()
  @ApiProperty({})
  @IsString()
  paymentReference!: string;

  @Exclude()
  @ApiProperty({})
  @IsString()
  transactionReference!: string;

  @ApiProperty({})
  @IsNumber({ maxDecimalPlaces: 7 })
  accountDurationSeconds!: number;

  @Exclude()
  @ApiProperty({})
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @ApiProperty({})
  @IsNumber({ maxDecimalPlaces: 2 })
  fee!: number;

  @ApiProperty({})
  @IsNumber({ maxDecimalPlaces: 2 })
  totalPayable!: number;

  @ApiProperty({})
  @IsArray()
  @IsDateString()
  requestTime!: string;
}

export class MonnifyPaymentInitiate {
  @ApiProperty({})
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @ApiProperty({})
  @IsString()
  customerName!: string;

  @ApiProperty({})
  @IsString()
  customerEmail!: string;

  @ApiProperty({})
  @IsString()
  paymentReference!: string;

  @ApiProperty({})
  @IsString()
  paymentDescription!: string;

  @ApiProperty({})
  @IsString()
  currencyCode!: string;

  @ApiProperty({})
  @IsString()
  contractCode!: string;

  @ApiProperty({})
  @IsString()
  redirectUrl!: string;

  @ApiProperty({
    isArray: true,
  })
  @IsArray()
  @IsNotEmpty()
  paymentMethods!: string[];
}

export class MonnifyPaymentResult extends MonnifyBaseResponseDto {
  responseBody!: MonnifyPaymentDto;
}
export class MonnifyBankPaymentResponse extends MonnifyBaseResponseDto {
  responseBody!: MonnifyBankPaymentDto;
}

// export class MetaData {
//   @ApiProperty({
//     example: 1,
//   })
//   @IsNumber()
//   electionId!: number;

//   @ApiProperty({
//     example: 1,
//   })
//   @IsNumber()
//   vn!: number;

//   @ApiPropertyOptional({
//     example: 1,
//     enum: StageType,
//   })
//   @IsEnum(StageType)
//   stageType!: StageType;

//   @ApiPropertyOptional({
//     example: 1,
//     enum: StagedElectionType,
//   })
//   @IsEnum(StagedElectionType)
//   electionStageType!: StagedElectionType;

//   @ApiProperty({
//     example: 1,
//   })
//   @IsNumber()
//   candidateId!: number;
// }

export class FunWalletDto {
  @ApiProperty({})
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;
}
