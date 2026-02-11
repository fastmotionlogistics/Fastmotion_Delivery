import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// import { AutoMap } from '@automapper/classes';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDecimal,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsStrongPassword,
  ValidateNested,
} from 'class-validator';

export class MonnifyBaseResponseDto {
  @ApiProperty({})
  @IsBoolean()
  requestSuccessful!: boolean;

  @ApiProperty({})
  @IsString()
  responseMessage!: string;

  @ApiProperty({})
  @IsString()
  responseCode!: string;
}
class MonnifyAuthDto {
  @ApiProperty({})
  @IsString()
  accessToken!: string;

  @ApiProperty({})
  @IsNumber()
  expiresIn!: number;
}

export class MonnifyAuthResponse extends MonnifyBaseResponseDto {
  responseBody!: MonnifyAuthDto;
}

export class PayCardResponseDto {
  @ApiProperty()
  @IsString()
  cardType!: string;
  @ApiProperty()
  @IsString()
  last4!: string;
  @ApiProperty()
  @IsString()
  expMonth!: string;
  @ApiProperty()
  @IsString()
  expYear!: string;
  @ApiProperty()
  @IsString()
  bin!: string;
  @ApiProperty()
  @IsString()
  bankCode!: string;
  @ApiProperty()
  @IsString()
  bankName!: string;
  @ApiProperty()
  @IsString()
  maskedPan!: string;
  @ApiProperty()
  @IsBoolean()
  reusable!: boolean;
  @ApiProperty()
  @IsString()
  countryCode!: string;
  @ApiProperty()
  @IsString()
  cardToken!: string;

  @ApiProperty()
  @IsBoolean()
  supportsTokenization!: boolean;
}
class MonnifyReserveBalance {
  availableBalance!: number;

  @ApiProperty()
  @IsDecimal()
  ledgerBalance!: number;
}

export class MonnifyAcctBalanceResponse extends MonnifyBaseResponseDto {
  responseBody!: MonnifyReserveBalance;
}

export class MonnifyChargeCardDto {
  @ApiProperty()
  @IsString()
  cardToken!: string;

  @ApiProperty()
  @IsString()
  customerName!: string;

  @ApiProperty()
  @IsString()
  customerEmail!: string;

  @ApiProperty()
  @IsString()
  paymentReference!: string;

  @ApiProperty()
  @IsString()
  paymentDescription!: string;

  @ApiProperty()
  @IsString()
  currencyCode!: string;

  @ApiProperty()
  @IsString()
  contractCode!: string;

  @ApiProperty()
  @IsString()
  apiKey!: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;
}

// export class VtDataDto {
//   @IsNumber()
//   vn: any;

//   @IsNumber()
//   electionId: any;

//   // @ApiPropertyOptional({
//   //   example: 1,
//   //   enum: StageType,
//   // })
//   // @IsEnum(StageType)
//   stageType?: any;

//   @ApiPropertyOptional({
//     example: 1,
//     enum: StagedElectionType,
//   })
//   @IsEnum(StagedElectionType)
//   electionStageType?: any;

//   @ApiPropertyOptional({
//     example: 1,
//     enum: PaymentTransactionType,
//   })
//   @IsEnum(PaymentTransactionType)
//   transactionType?: PaymentTransactionType;

//   @IsNumber()
//   businessId?: any;

//   @IsNumber()
//   candidateId: any;
// }

export class MonnifyTransactionDto {
  @ApiProperty()
  @IsString()
  transactionReference!: string;

  @ApiProperty()
  @IsString()
  paymentReference!: string;

  @ApiProperty()
  @IsString()
  paidOn!: string;

  @ApiProperty()
  @IsString()
  paymentDescription!: string;

  @ApiProperty()
  @IsString()
  paymentMethod!: string;

  @ApiProperty()
  @IsString()
  currency!: string;

  @ApiProperty()
  @IsString()
  settlementAmount!: string;

  @ApiProperty()
  @IsString()
  paymentStatus!: string;

  @ApiProperty()
  @IsString()
  amountPaid!: string;

  @ApiProperty()
  @IsString()
  totalPayable!: string;

  @Type(() => PayCardResponseDto)
  cardDetails!: PayCardResponseDto;

  // @ApiProperty({
  //   type: VtDataDto,
  // })
  // @IsNotEmpty()
  // @ValidateNested({ each: true })
  // @Type(() => VtDataDto)
  // metaData!: VtDataDto;
}

export class MonnifyTransactionResponse extends MonnifyBaseResponseDto {
  responseBody!: MonnifyTransactionDto;
}
