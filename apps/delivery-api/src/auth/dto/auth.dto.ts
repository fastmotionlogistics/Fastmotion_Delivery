import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsStrongPassword,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { VehicleTypeEnum } from '@libs/common';

export class RegisterRiderDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  lastName: string;

  @ApiProperty({ example: 'rider@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({ example: 'Password@123' })
  @IsStrongPassword()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;

  @ApiPropertyOptional({ enum: VehicleTypeEnum, example: VehicleTypeEnum.MOTORCYCLE })
  @IsEnum(VehicleTypeEnum)
  @IsOptional()
  vehicleType?: VehicleTypeEnum;
}

export class LoginRiderDto {
  @ApiProperty({ example: 'rider@example.com' })
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: 'fcm_token_here' })
  @IsString()
  @IsOptional()
  fcmToken?: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'rider@example.com' })
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(6)
  otpCode: string;
}

export class ResendOtpDto {
  @ApiProperty({ example: 'rider@example.com' })
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'rider@example.com' })
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'rider@example.com' })
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({ example: 'NewPassword@123' })
  @IsStrongPassword()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'NewPassword@123' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class LogoutDto {
  @ApiPropertyOptional({ example: 'refresh_token_here' })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
