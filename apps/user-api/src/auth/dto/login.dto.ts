import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// import { AutoMap } from '@automapper/classes';
import { Type } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsStrongPassword } from 'class-validator';

export class LoginDto {
  // @AutoMap()
  @ApiProperty({
    example: 'user@email.com',
    description: 'Email address',
  })
  @IsString()
  email: string; // Can be email or phone number

  // @AutoMap()
  @ApiProperty({
    example: 'Password@123',
  })
  @IsStrongPassword()
  password: string;

  @ApiPropertyOptional({})
  @IsString()
  @IsOptional()
  fcmToken: string = null;
}
export class ResetPasswordDto {
  // @AutoMap()
  @ApiProperty({
    example: 'email@email.com or +2348012345678',
    description: 'Email address or phone number',
  })
  @IsString()
  email: string; // Can be email or phone number

  // @AutoMap()
  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code',
  })
  @IsString()
  otp: string;

  // @AutoMap()
  @ApiProperty({
    example: 'NewPassword@123',
    description: 'New password',
  })
  @IsStrongPassword()
  password: string;
}
export class ForgotPasswordDto {
  // @AutoMap()
  @ApiProperty({
    example: 'email@email.com or +2348012345678',
    description: 'Email address or phone number',
  })
  @IsString()
  email: string; // Can be email or phone number
}
export class GoogleSignDto {
  // @AutoMap()
  @ApiProperty({})
  @IsString()
  accessToken: string;
}
