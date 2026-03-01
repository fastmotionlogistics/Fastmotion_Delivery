import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AdminAppVersionService } from './app-version.service';
import { UpsertAppVersionDto } from './dto';
import { AdminJwtAuthGuard, PermissionGuard } from '../auth/guards';

@ApiTags('Admin - App Version')
@Controller('app-version')
@UseGuards(AdminJwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class AdminAppVersionController {
  constructor(private readonly service: AdminAppVersionService) {}

  @ApiOperation({ summary: 'Set/update app version config (user or rider)' })
  @ApiBody({ type: UpsertAppVersionDto })
  @Post()
  async upsertVersion(@Body() dto: UpsertAppVersionDto) {
    return this.service.upsertVersion(dto);
  }

  @ApiOperation({ summary: 'Get all app version configs' })
  @Get()
  async getVersions() {
    return this.service.getVersions();
  }

  @ApiOperation({ summary: 'Get version config by app type' })
  @Get(':appType')
  async getVersionByType(@Param('appType') appType: string) {
    return this.service.getVersionByType(appType);
  }
}
