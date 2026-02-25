import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsStrongPassword,
  IsBoolean,
  IsNumber,
  IsArray,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { VehicleTypeEnum } from '@libs/common';

// ── Create Rider (admin only) ────────────────────────────
export class CreateRiderDto {
  @ApiProperty({ example: 'Emeka' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  firstName: string;

  @ApiProperty({ example: 'Okafor' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  lastName: string;

  @ApiProperty({ example: 'emeka@fastmotion.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: 'Password@123', description: 'Initial password for the rider' })
  @IsStrongPassword()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: ['male', 'female'] })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: 'motorcycle', enum: VehicleTypeEnum })
  @IsEnum(VehicleTypeEnum)
  @IsOptional()
  vehicleType?: string;

  @ApiPropertyOptional({ example: 'LAG-123-XY' })
  @IsString()
  @IsOptional()
  vehiclePlateNumber?: string;

  @ApiPropertyOptional({ example: 'Honda ACE 125' })
  @IsString()
  @IsOptional()
  vehicleModel?: string;

  @ApiPropertyOptional({ example: 'Black' })
  @IsString()
  @IsOptional()
  vehicleColor?: string;

  @ApiPropertyOptional({ description: 'Lock to specific device', default: true })
  @IsBoolean()
  @IsOptional()
  enforceDeviceBinding?: boolean;

  @ApiPropertyOptional({ description: 'Max deliveries at once', default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  maxConcurrentDeliveries?: number;

  @ApiPropertyOptional({ description: 'Zone ObjectIds to assign rider to' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assignedZones?: string[];
}

// ── Update Rider (admin) ─────────────────────────────────
export class UpdateRiderDto {
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(64) firstName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(64) lastName?: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(20) phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() gender?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() vehicleType?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() vehiclePlateNumber?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() vehicleModel?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() vehicleColor?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() enforceDeviceBinding?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() canAcceptOutsideZone?: boolean;
  @ApiPropertyOptional() @IsNumber() @IsOptional() @Min(1) @Max(5) maxConcurrentDeliveries?: number;
  @ApiPropertyOptional() @IsArray() @IsString({ each: true }) @IsOptional() assignedZones?: string[];
}

// ── Suspend Rider ────────────────────────────────────────
export class SuspendRiderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

// ── Reset Rider Password ─────────────────────────────────
export class ResetRiderPasswordDto {
  @ApiProperty()
  @IsStrongPassword()
  @MinLength(8)
  newPassword: string;
}

// ── Unbind Device ────────────────────────────────────────
export class BindDeviceDto {
  @ApiPropertyOptional({ description: 'New device ID to bind. Omit to unbind.' })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  deviceModel?: string;
}

// ── Verify Rider ─────────────────────────────────────────
export class VerifyRiderDto {
  @ApiProperty({ enum: ['verified', 'rejected'] })
  @IsEnum(['verified', 'rejected'])
  status: 'verified' | 'rejected';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

// ── Filters ──────────────────────────────────────────────
export class RiderFilterDto {
  @ApiPropertyOptional() @IsString() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() verificationStatus?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() search?: string;
  @ApiPropertyOptional() @IsOptional() isOnline?: boolean;
  @ApiPropertyOptional() @IsNumber() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() limit?: number;
}
