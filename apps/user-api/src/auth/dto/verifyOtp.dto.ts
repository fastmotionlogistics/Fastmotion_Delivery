import { ApiProperty } from '@nestjs/swagger';
// import { AutoMap } from '@automapper/classes';
import { Type } from 'class-transformer';
import { IsString } from 'class-validator';

export class VerifyOtpDto {
  // @AutoMap()
  @ApiProperty()
  @IsString()
  verificationToken: string;

  // @AutoMap()
  @ApiProperty({
    example: '123456',
  })
  @IsString()
  otpCode: string;
}
