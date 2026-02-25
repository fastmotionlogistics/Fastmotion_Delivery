import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import {
  CreateDeliveryRequestDto,
  RescheduleDeliveryDto,
  CancelDeliveryDto,
  VerifyPinDto,
  InitiatePickupPaymentDto,
  ConfirmPaymentDto,
  ConfirmReschedulePaymentDto,
} from './dto';
import { CurrentUser, JwtAuthGuard } from '@libs/auth';
import { User } from '@libs/database';

@ApiTags('Delivery')
@Controller('delivery')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @ApiOperation({ summary: 'Create a new delivery request' })
  @ApiBody({ type: CreateDeliveryRequestDto })
  @Post()
  async createDeliveryRequest(
    @CurrentUser() user: User,
    @Body() body: CreateDeliveryRequestDto,
  ) {
    return await this.deliveryService.createDeliveryRequest(user, body);
  }

  @ApiOperation({ summary: 'Get price estimate for delivery' })
  @ApiBody({ type: CreateDeliveryRequestDto })
  @Post('estimate')
  async getDeliveryEstimate(
    @CurrentUser() user: User,
    @Body() body: CreateDeliveryRequestDto,
  ) {
    return await this.deliveryService.getDeliveryEstimate(user, body);
  }

  @ApiOperation({ summary: 'Get all delivery requests for the current user' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'deliveryType', required: false })
  @ApiQuery({ name: 'search', required: false, description: 'Search by tracking number' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date (ISO string)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date (ISO string)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get()
  async getMyDeliveries(
    @CurrentUser() user: User,
    @Query('status') status?: string,
    @Query('deliveryType') deliveryType?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.deliveryService.getMyDeliveries(user, {
      status, deliveryType, search, dateFrom, dateTo, page, limit,
    });
  }

  // ============ Catalog (Categories & Handling) ============

  @ApiOperation({ summary: 'Get active item categories for parcel selection' })
  @Get('catalog/categories')
  async getCategories() {
    return await this.deliveryService.getCategories();
  }

  @ApiOperation({ summary: 'Get active special handling options' })
  @Get('catalog/handling')
  async getHandling() {
    return await this.deliveryService.getHandling();
  }

  @ApiOperation({ summary: 'Track delivery by tracking number (e.g. FM-KJHS-3H)' })
  @Get('track/:trackingNumber')
  async trackByTrackingNumber(
    @CurrentUser() user: User,
    @Param('trackingNumber') trackingNumber: string,
  ) {
    return await this.deliveryService.trackByTrackingNumber(user, trackingNumber);
  }

  @ApiOperation({ summary: 'Get delivery request by ID' })
  @Get(':id')
  async getDeliveryById(@CurrentUser() user: User, @Param('id') id: string) {
    return await this.deliveryService.getDeliveryById(user, id);
  }

  @ApiOperation({ summary: 'Track delivery in real-time' })
  @Get(':id/track')
  async trackDelivery(@CurrentUser() user: User, @Param('id') id: string) {
    return await this.deliveryService.trackDelivery(user, id);
  }

  @ApiOperation({ summary: 'Get pickup PIN for a delivery' })
  @Get(':id/pickup-pin')
  async getPickupPin(@CurrentUser() user: User, @Param('id') id: string) {
    return await this.deliveryService.getPickupPin(user, id);
  }

  @ApiOperation({ summary: 'Get delivery PIN for a delivery' })
  @Get(':id/delivery-pin')
  async getDeliveryPin(@CurrentUser() user: User, @Param('id') id: string) {
    return await this.deliveryService.getDeliveryPin(user, id);
  }

  @ApiOperation({ summary: 'Reschedule a scheduled delivery' })
  @ApiBody({ type: RescheduleDeliveryDto })
  @Patch(':id/reschedule')
  async rescheduleDelivery(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: RescheduleDeliveryDto,
  ) {
    return await this.deliveryService.rescheduleDelivery(user, id, body);
  }

  @ApiOperation({ summary: 'Cancel a delivery request' })
  @ApiBody({ type: CancelDeliveryDto })
  @Delete(':id')
  async cancelDelivery(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: CancelDeliveryDto,
  ) {
    return await this.deliveryService.cancelDelivery(user, id, body);
  }

  @ApiOperation({ summary: 'Get delivery history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get('history/all')
  async getDeliveryHistory(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.deliveryService.getDeliveryHistory(user, { page, limit });
  }

  // ============ Quick Delivery Payment at Pickup Flow ============

  @ApiOperation({
    summary: 'Initiate payment at pickup (Quick delivery)',
    description: 'For quick delivery: initiate payment when rider arrives at pickup location'
  })
  @ApiBody({ type: InitiatePickupPaymentDto })
  @Post(':id/initiate-pickup-payment')
  async initiatePickupPayment(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: InitiatePickupPaymentDto,
  ) {
    return await this.deliveryService.initiatePickupPayment(user, id, body);
  }

  @ApiOperation({
    summary: 'Confirm pickup payment (Quick delivery)',
    description: 'Confirm payment after successful payment processing'
  })
  @ApiBody({ type: ConfirmPaymentDto })
  @Post(':id/confirm-pickup-payment')
  async confirmPickupPayment(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: ConfirmPaymentDto,
  ) {
    return await this.deliveryService.confirmPickupPayment(user, id, body);
  }

  // ============ Rescheduling with Price Adjustment ============

  @ApiOperation({
    summary: 'Get reschedule price difference',
    description: 'Calculate price difference when rescheduling to a new time'
  })
  @ApiBody({ type: RescheduleDeliveryDto })
  @Post(':id/reschedule-preview')
  async previewReschedule(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: RescheduleDeliveryDto,
  ) {
    return await this.deliveryService.previewReschedule(user, id, body);
  }

  @ApiOperation({
    summary: 'Confirm reschedule with additional payment',
    description: 'Confirm rescheduling after paying any price difference'
  })
  @ApiBody({ type: ConfirmReschedulePaymentDto })
  @Post(':id/confirm-reschedule-payment')
  async confirmReschedulePayment(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: ConfirmReschedulePaymentDto,
  ) {
    return await this.deliveryService.confirmReschedulePayment(user, id, body);
  }

  // ============ Rider Information ============

  @ApiOperation({
    summary: 'Get rider info for delivery',
    description: 'Returns rider name, photo, location, ETA. Contact details NOT included per policy.'
  })
  @Get(':id/rider')
  async getRiderInfo(@CurrentUser() user: User, @Param('id') id: string) {
    return await this.deliveryService.getRiderInfo(user, id);
  }

  // ============ Rescheduling Rules ============

  @ApiOperation({
    summary: 'Check if delivery can be rescheduled',
    description: 'Returns whether rescheduling is allowed based on current status'
  })
  @Get(':id/can-reschedule')
  async canReschedule(@CurrentUser() user: User, @Param('id') id: string) {
    return await this.deliveryService.canReschedule(user, id);
  }

  // ============ Coupon Validation ============

  @ApiOperation({
    summary: 'Validate a coupon code',
    description: 'Check if a coupon is valid and get the discount details before creating a delivery',
  })
  @Get('coupon/validate/:code')
  async validateCoupon(@CurrentUser() user: User, @Param('code') code: string) {
    return await this.deliveryService.validateCoupon(user, code);
  }

  // ============ Active Delivery ============

  @ApiOperation({
    summary: 'Get active delivery',
    description: 'Returns the currently active/in-progress delivery if any',
  })
  @Get('active/current')
  async getActiveDelivery(@CurrentUser() user: User) {
    return await this.deliveryService.getActiveDelivery(user);
  }

}
