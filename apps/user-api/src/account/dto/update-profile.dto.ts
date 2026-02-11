import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum, MaxLength, Matches } from 'class-validator';
import { Gender } from '@libs/common';

/**
 * Update profile DTO - all fields optional for partial updates
 * PRD Section 5.1: Full name, Email, Phone, Profile photograph
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Adebayo' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Ogunlesi' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  lastName?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in valid international format (E.164)',
  })
  phone?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ example: '1995-06-15' })
  @IsDateString()
  @IsOptional()
  dob?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/xxx/image.jpg' })
  @IsString()
  @IsOptional()
  profilePhoto?: string;

  @ApiPropertyOptional({ example: '6.5244' })
  @IsString()
  @IsOptional()
  latitude?: string;

  @ApiPropertyOptional({ example: '3.3792' })
  @IsString()
  @IsOptional()
  longitude?: string;
}

/**
 * Notification preferences
 */
export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  emailNotification?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  mobileNotification?: boolean;
}
