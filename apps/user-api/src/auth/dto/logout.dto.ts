import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({
    description: 'Optional refresh token to revoke. If not provided, all user tokens will be revoked.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

