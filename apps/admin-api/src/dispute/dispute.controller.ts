import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { AdminDisputeService } from './dispute.service';
import { UpdateDisputeStatusDto, AddAdminMessageDto, AssignDisputeDto } from './dto';
import { AdminJwtAuthGuard, PermissionGuard } from '../auth/guards';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';

@ApiTags('Admin - Dispute Management')
@Controller('dispute')
@UseGuards(AdminJwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class AdminDisputeController {
  constructor(private readonly disputeService: AdminDisputeService) {}

  @ApiOperation({ summary: 'Get all disputes with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'reason', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get()
  async getAllDisputes(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('reason') reason?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.disputeService.getAllDisputes({ status, priority, reason, page, limit });
  }

  @ApiOperation({ summary: 'Get dispute by ID' })
  @Get(':id')
  async getDisputeById(@Param('id') id: string) {
    return this.disputeService.getDisputeById(id);
  }

  @ApiOperation({ summary: 'Update dispute status (in_review, resolved, closed, escalated)' })
  @ApiBody({ type: UpdateDisputeStatusDto })
  @Patch('status')
  async updateDisputeStatus(
    @CurrentAdmin() admin: any,
    @Body() body: UpdateDisputeStatusDto,
  ) {
    return this.disputeService.updateDisputeStatus(admin._id.toString(), body);
  }

  @ApiOperation({ summary: 'Add admin message to dispute' })
  @ApiBody({ type: AddAdminMessageDto })
  @Post('message')
  async addAdminMessage(
    @CurrentAdmin() admin: any,
    @Body() body: AddAdminMessageDto,
  ) {
    return this.disputeService.addAdminMessage(admin._id.toString(), body);
  }

  @ApiOperation({ summary: 'Assign dispute to an admin' })
  @ApiBody({ type: AssignDisputeDto })
  @Post('assign')
  async assignDispute(@Body() body: AssignDisputeDto) {
    return this.disputeService.assignDispute(body);
  }
}
