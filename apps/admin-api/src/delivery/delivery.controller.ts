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
import { DeliveryService } from './delivery.service';
import {
  AssignRiderDto,
  OverridePinDto,
  ManualCompleteDto,
  ManualCancelDto,
  AdjustPriceDto,
  UpdateDeliveryStatusDto,
  IssueRefundDto,
  DeliveryFilterDto,
} from './dto';

@ApiTags('Admin - Delivery Management')
@Controller('delivery')
// @UseGuards(AdminJwtAuthGuard) // TODO: Add admin auth guard
@ApiBearerAuth()
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  // ============ Delivery Queries ============

  @ApiOperation({ summary: 'Get all deliveries with filters' })
  @Get()
  async getAllDeliveries(@Query() filters: DeliveryFilterDto) {
    return await this.deliveryService.getAllDeliveries(filters);
  }

  @ApiOperation({ summary: 'Get delivery by ID' })
  @Get(':id')
  async getDeliveryById(@Param('id') id: string) {
    return await this.deliveryService.getDeliveryById(id);
  }

  @ApiOperation({ summary: 'Get deliveries pending rider assignment (scheduled)' })
  @Get('pending/assignment')
  async getPendingAssignment() {
    return await this.deliveryService.getPendingAssignment();
  }

  @ApiOperation({ summary: 'Get deliveries with disputes' })
  @Get('disputes/all')
  async getDeliveriesWithDisputes(@Query() filters: DeliveryFilterDto) {
    return await this.deliveryService.getDeliveriesWithDisputes(filters);
  }

  @ApiOperation({ summary: 'Get delivery statistics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @Get('stats/overview')
  async getDeliveryStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.deliveryService.getDeliveryStats({ startDate, endDate });
  }

  // ============ Rider Assignment ============

  @ApiOperation({ summary: 'Assign rider to scheduled delivery' })
  @ApiBody({ type: AssignRiderDto })
  @Post('assign-rider')
  async assignRider(@Body() body: AssignRiderDto) {
    return await this.deliveryService.assignRider(body);
  }

  @ApiOperation({ summary: 'Reassign rider to delivery' })
  @ApiBody({ type: AssignRiderDto })
  @Post('reassign-rider')
  async reassignRider(@Body() body: AssignRiderDto) {
    return await this.deliveryService.reassignRider(body);
  }

  // ============ Admin Overrides ============

  @ApiOperation({ summary: 'Override PIN validation' })
  @ApiBody({ type: OverridePinDto })
  @Post('override-pin')
  async overridePin(@Body() body: OverridePinDto) {
    return await this.deliveryService.overridePin(body);
  }

  @ApiOperation({ summary: 'Manually complete delivery' })
  @ApiBody({ type: ManualCompleteDto })
  @Post('manual-complete')
  async manualComplete(@Body() body: ManualCompleteDto) {
    return await this.deliveryService.manualComplete(body);
  }

  @ApiOperation({ summary: 'Manually cancel delivery' })
  @ApiBody({ type: ManualCancelDto })
  @Post('manual-cancel')
  async manualCancel(@Body() body: ManualCancelDto) {
    return await this.deliveryService.manualCancel(body);
  }

  @ApiOperation({ summary: 'Adjust delivery price' })
  @ApiBody({ type: AdjustPriceDto })
  @Post('adjust-price')
  async adjustPrice(@Body() body: AdjustPriceDto) {
    return await this.deliveryService.adjustPrice(body);
  }

  @ApiOperation({ summary: 'Update delivery status' })
  @ApiBody({ type: UpdateDeliveryStatusDto })
  @Patch('status')
  async updateStatus(@Body() body: UpdateDeliveryStatusDto) {
    return await this.deliveryService.updateStatus(body);
  }

  // ============ Refunds ============

  @ApiOperation({ summary: 'Issue refund for delivery' })
  @ApiBody({ type: IssueRefundDto })
  @Post('refund')
  async issueRefund(@Body() body: IssueRefundDto) {
    return await this.deliveryService.issueRefund(body);
  }

  // ============ Audit ============

  @ApiOperation({ summary: 'Get admin actions for a delivery' })
  @Get(':id/admin-actions')
  async getAdminActions(@Param('id') id: string) {
    return await this.deliveryService.getAdminActions(id);
  }

  @ApiOperation({ summary: 'Get delivery timeline' })
  @Get(':id/timeline')
  async getDeliveryTimeline(@Param('id') id: string) {
    return await this.deliveryService.getDeliveryTimeline(id);
  }
}
