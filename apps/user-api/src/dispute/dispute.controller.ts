import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { DisputeService } from './dispute.service';
import { CreateDisputeDto, AddDisputeMessageDto, UpdateDisputeDto } from './dto';
import { CurrentUser, JwtAuthGuard } from '@libs/auth';
import { User } from '@libs/database';

@ApiTags('Dispute')
@Controller('dispute')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @ApiOperation({ summary: 'Create a new dispute' })
  @ApiBody({ type: CreateDisputeDto })
  @Post()
  async createDispute(@CurrentUser() user: User, @Body() body: CreateDisputeDto) {
    return await this.disputeService.createDispute(user, body);
  }

  @ApiOperation({ summary: 'Get dispute by ID' })
  @Get(':id')
  async getDisputeById(@CurrentUser() user: User, @Param('id') id: string) {
    return await this.disputeService.getDisputeById(user, id);
  }

  @ApiOperation({ summary: 'Get dispute by delivery request ID' })
  @Get('delivery/:deliveryId')
  async getDisputeByDelivery(
    @CurrentUser() user: User,
    @Param('deliveryId') deliveryId: string,
  ) {
    return await this.disputeService.getDisputeByDelivery(user, deliveryId);
  }

  @ApiOperation({ summary: 'Get all disputes for the current user' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get()
  async getMyDisputes(
    @CurrentUser() user: User,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.disputeService.getMyDisputes(user, { status, page, limit });
  }

  @ApiOperation({ summary: 'Add a message to a dispute' })
  @ApiBody({ type: AddDisputeMessageDto })
  @Post(':id/message')
  async addDisputeMessage(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: AddDisputeMessageDto,
  ) {
    return await this.disputeService.addDisputeMessage(user, id, body);
  }

  @ApiOperation({ summary: 'Update dispute details' })
  @ApiBody({ type: UpdateDisputeDto })
  @Put(':id')
  async updateDispute(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: UpdateDisputeDto,
  ) {
    return await this.disputeService.updateDispute(user, id, body);
  }

  @ApiOperation({ summary: 'Get dispute reasons' })
  @Get('reasons/list')
  async getDisputeReasons() {
    return await this.disputeService.getDisputeReasons();
  }
}
