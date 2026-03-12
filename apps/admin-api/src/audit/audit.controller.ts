import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditFilterDto } from './dto/audit-filter.dto';
import { AdminJwtAuthGuard, PermissionGuard } from '../auth/guards';

@ApiTags('Admin - Audit Logs')
@Controller('audit')
@UseGuards(AdminJwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @ApiOperation({ summary: 'Get audit logs with filters' })
  @Get()
  async getAuditLogs(@Query() filters: AuditFilterDto) {
    return await this.auditService.findAll(filters);
  }

  @ApiOperation({ summary: 'Get audit log stats' })
  @Get('stats')
  async getAuditStats() {
    return await this.auditService.getStats();
  }
}
