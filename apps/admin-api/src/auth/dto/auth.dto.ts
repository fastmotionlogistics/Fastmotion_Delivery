import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsStrongPassword,
  MinLength,
  MaxLength,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { AdminRoleEnum, AdminPermissionEnum } from '@libs/database';

// ── Admin Login ──────────────────────────────────────────
export class LoginAdminDto {
  @ApiProperty({ example: 'admin@fastmotion.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

// ── Change Password ──────────────────────────────────────
export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty()
  @IsStrongPassword()
  @MinLength(8)
  newPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

// ── Create Admin (super_admin only) ──────────────────────
export class CreateAdminDto {
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

  @ApiProperty({ example: 'john@fastmotion.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ example: 'TempPassword@123', description: 'Initial password (admin must change on first login)' })
  @IsStrongPassword()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: AdminRoleEnum })
  @IsEnum(AdminRoleEnum)
  role: AdminRoleEnum;

  @ApiPropertyOptional({ enum: AdminPermissionEnum, isArray: true, description: 'Custom permissions (overrides role defaults)' })
  @IsArray()
  @IsEnum(AdminPermissionEnum, { each: true })
  @IsOptional()
  permissions?: AdminPermissionEnum[];
}

// ── Update Admin ─────────────────────────────────────────
export class UpdateAdminDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(64)
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(64)
  lastName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ enum: AdminRoleEnum })
  @IsEnum(AdminRoleEnum)
  @IsOptional()
  role?: AdminRoleEnum;

  @ApiPropertyOptional({ enum: AdminPermissionEnum, isArray: true })
  @IsArray()
  @IsEnum(AdminPermissionEnum, { each: true })
  @IsOptional()
  permissions?: AdminPermissionEnum[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// ── Reset Admin Password (super_admin) ───────────────────
export class ResetAdminPasswordDto {
  @ApiProperty()
  @IsStrongPassword()
  @MinLength(8)
  newPassword: string;
}

// ── Logout ───────────────────────────────────────────────
export class LogoutAdminDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
