import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsStrongPassword,
  MinLength,
  MaxLength,
} from 'class-validator';

// ── Login (email or phone — no signup for riders) ────────
export class LoginRiderDto {
  @ApiProperty({ example: 'rider@fastmotion.com', description: 'Email address or phone number' })
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: 'fcm_token_here', description: 'Firebase Cloud Messaging token' })
  @IsString()
  @IsOptional()
  fcmToken?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890', description: 'Unique device identifier for device binding' })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({ example: 'iPhone 15 Pro', description: 'Device model name for reference' })
  @IsString()
  @IsOptional()
  deviceModel?: string;
}

// ── Bike Verification (post-login step) ──────────────────
export class VerifyBikeDto {
  @ApiProperty({ example: 'B-124', description: 'Bike identifier printed/tagged on the vehicle' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  bikeId: string;

  @ApiPropertyOptional({ example: 'LAG-123-XY', description: 'Vehicle plate number (optional override)' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  vehiclePlateNumber?: string;
}

// ── Forgot Password ──────────────────────────────────────
export class ForgotPasswordDto {
  @ApiProperty({ example: 'rider@fastmotion.com', description: 'Email or phone to receive OTP' })
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;
}

// ── Reset Password ───────────────────────────────────────
export class ResetPasswordDto {
  @ApiProperty({ example: 'rider@fastmotion.com' })
  @IsString()
  @IsNotEmpty()
  emailOrPhone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(6)
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

// ── Logout ───────────────────────────────────────────────
export class LogoutDto {
  @ApiPropertyOptional({ example: 'refresh_token_here' })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
