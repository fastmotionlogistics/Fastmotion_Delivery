import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsStrongPassword, MinLength, MaxLength, Matches, IsOptional, IsEmail } from 'class-validator';

/**
 * Registration DTO for FastMotion Customer App
 * Per PRD Section 5.1: Full name, Email, Phone, Profile photo, Password
 */
export class RegisterShopUserDto {
  @ApiProperty({
    example: 'Adebayo',
    description: 'First name of the user',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  firstName: string;

  @ApiProperty({
    example: 'Ogunlesi',
    description: 'Last name of the user',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  lastName: string;

  @ApiProperty({
    example: 'user@email.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '+2348012345678',
    description: 'Phone number with country code',
  })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in valid international format (E.164)',
  })
  phone: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Strong password',
  })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Confirm password',
  })
  @IsString()
  confirmPassword: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/xxx/image.jpg',
    description: 'Profile photograph URL (uploaded via /account/upload)',
  })
  @IsString()
  @IsOptional()
  profilePhoto?: string;
}

export class VerifyPhoneOtpDto {
  @ApiProperty({
    example: '+2348012345678',
    description: 'Phone number that received the OTP',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otpCode: string;
}
export class VerifyEmailOtpDto {
  @ApiProperty({
    example: 'user@email.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otpCode: string;
}

export class ResendOtpDto {
  @ApiProperty({
    example: '+2348012345678',
    description: 'Phone number to resend OTP to',
  })
  @IsString()
  phone: string;
}
export class ResendEmailOtpDto {
  @ApiProperty({
    example: 'user@email.com',
    description: 'Email to resend OTP to',
  })
  @IsEmail()
  email: string;
}
