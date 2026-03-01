import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class UpsertAppVersionDto {
  @ApiProperty({ enum: ['user', 'rider'] })
  @IsEnum(['user', 'rider'])
  @IsNotEmpty()
  appType: 'user' | 'rider';

  @ApiProperty({ example: '2.1.0', description: 'Latest available version' })
  @IsString()
  @IsNotEmpty()
  currentVersion: string;

  @ApiProperty({ example: '2.0.0', description: 'Minimum required version (force update below this)' })
  @IsString()
  @IsNotEmpty()
  minimumVersion: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean;

  @ApiPropertyOptional({ example: 'New Version Available!' })
  @IsString()
  @IsOptional()
  updateTitle?: string;

  @ApiPropertyOptional({ example: 'We have added exciting new features.' })
  @IsString()
  @IsOptional()
  updateMessage?: string;

  @ApiPropertyOptional({ example: '- Bug fixes\n- Performance improvements' })
  @IsString()
  @IsOptional()
  releaseNotes?: string;

  @ApiPropertyOptional({ example: 'https://play.google.com/store/apps/details?id=com.fastmotion' })
  @IsString()
  @IsOptional()
  androidStoreUrl?: string;

  @ApiPropertyOptional({ example: 'https://apps.apple.com/app/fastmotion/id123456' })
  @IsString()
  @IsOptional()
  iosStoreUrl?: string;
}
