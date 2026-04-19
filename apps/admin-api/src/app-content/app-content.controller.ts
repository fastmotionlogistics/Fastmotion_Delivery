import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AdminAppContentService } from './app-content.service';
import { UpdateAppContentDto } from './dto';
import { AdminJwtAuthGuard, PermissionGuard } from '../auth/guards';
import { AuditCategoryEnum } from '@libs/database';
import { AuditAction } from '../audit/audit-action.decorator';

@ApiTags('Admin - App Content')
@Controller('app-content')
@UseGuards(AdminJwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class AdminAppContentController {
  constructor(private readonly service: AdminAppContentService) {}

  @ApiOperation({ summary: 'Get app content (terms, policy, FAQ, contact)' })
  @Get()
  async getContent() {
    return this.service.getContent();
  }

  @ApiOperation({ summary: 'Update app content' })
  @ApiBody({ type: UpdateAppContentDto })
  @AuditAction({ action: 'Update App Content', category: AuditCategoryEnum.SYSTEM, targetType: 'AppContent' })
  @Put()
  async updateContent(@Body() dto: UpdateAppContentDto) {
    return this.service.updateContent(dto);
  }
}
