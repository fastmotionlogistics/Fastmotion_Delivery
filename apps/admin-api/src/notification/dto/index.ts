import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum NotifTargetType {
  USER = 'user',
  RIDER = 'rider',
}

export enum NotifChannel {
  PUSH = 'push',
  EMAIL = 'email',
  BOTH = 'both',
}

// ── Send to a single recipient ──
export class SendNotificationDto {
  @ApiProperty({ description: 'Recipient ID (user or rider)' })
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty({ enum: NotifTargetType })
  @IsEnum(NotifTargetType)
  targetType: NotifTargetType;

  @ApiProperty({ example: 'Important Update' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Your delivery has been rescheduled.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;

  @ApiProperty({ enum: NotifChannel, default: NotifChannel.PUSH })
  @IsEnum(NotifChannel)
  @IsOptional()
  channel?: NotifChannel;
}

// ── Broadcast to all users, all riders, or both ──
export class BroadcastNotificationDto {
  @ApiProperty({ example: 'Service Announcement' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'We will undergo maintenance tonight at 11 PM.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;

  @ApiProperty({ enum: ['users', 'riders', 'all'] })
  @IsEnum(['users', 'riders', 'all'])
  audience: 'users' | 'riders' | 'all';

  @ApiProperty({ enum: NotifChannel, default: NotifChannel.PUSH })
  @IsEnum(NotifChannel)
  @IsOptional()
  channel?: NotifChannel;
}

// ── Filter history ──
export class NotificationFilterDto {
  @ApiPropertyOptional({ enum: NotifTargetType })
  @IsEnum(NotifTargetType)
  @IsOptional()
  targetType?: NotifTargetType;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
