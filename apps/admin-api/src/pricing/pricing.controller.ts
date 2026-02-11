import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import {
  CreatePricingConfigDto,
  UpdatePricingConfigDto,
  CreateLocationZoneDto,
  UpdateLocationZoneDto,
  CreateWeightPricingDto,
  UpdateWeightPricingDto,
  CreateTimePricingDto,
  UpdateTimePricingDto,
} from './dto';

@ApiTags('Admin - Pricing Management')
@Controller('pricing')
// @UseGuards(AdminJwtAuthGuard) // TODO: Add admin auth guard
@ApiBearerAuth()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // ============ Pricing Config ============

  @ApiOperation({ summary: 'Get active pricing configuration' })
  @Get('config')
  async getActivePricingConfig() {
    return await this.pricingService.getActivePricingConfig();
  }

  @ApiOperation({ summary: 'Get all pricing configurations' })
  @Get('config/all')
  async getAllPricingConfigs() {
    return await this.pricingService.getAllPricingConfigs();
  }

  @ApiOperation({ summary: 'Create pricing configuration' })
  @ApiBody({ type: CreatePricingConfigDto })
  @Post('config')
  async createPricingConfig(@Body() body: CreatePricingConfigDto) {
    return await this.pricingService.createPricingConfig(body);
  }

  @ApiOperation({ summary: 'Update pricing configuration' })
  @ApiBody({ type: UpdatePricingConfigDto })
  @Put('config/:id')
  async updatePricingConfig(
    @Param('id') id: string,
    @Body() body: UpdatePricingConfigDto,
  ) {
    return await this.pricingService.updatePricingConfig(id, body);
  }

  // ============ Location Zones ============

  @ApiOperation({ summary: 'Get all location zones' })
  @ApiQuery({ name: 'status', required: false })
  @Get('zones')
  async getAllZones(@Query('status') status?: string) {
    return await this.pricingService.getAllZones(status);
  }

  @ApiOperation({ summary: 'Get zone by ID' })
  @Get('zones/:id')
  async getZoneById(@Param('id') id: string) {
    return await this.pricingService.getZoneById(id);
  }

  @ApiOperation({ summary: 'Create location zone' })
  @ApiBody({ type: CreateLocationZoneDto })
  @Post('zones')
  async createZone(@Body() body: CreateLocationZoneDto) {
    return await this.pricingService.createZone(body);
  }

  @ApiOperation({ summary: 'Update location zone' })
  @ApiBody({ type: UpdateLocationZoneDto })
  @Put('zones/:id')
  async updateZone(@Param('id') id: string, @Body() body: UpdateLocationZoneDto) {
    return await this.pricingService.updateZone(id, body);
  }

  @ApiOperation({ summary: 'Delete location zone' })
  @Delete('zones/:id')
  async deleteZone(@Param('id') id: string) {
    return await this.pricingService.deleteZone(id);
  }

  // ============ Weight Pricing ============

  @ApiOperation({ summary: 'Get all weight pricing tiers' })
  @ApiQuery({ name: 'status', required: false })
  @Get('weight')
  async getAllWeightPricing(@Query('status') status?: string) {
    return await this.pricingService.getAllWeightPricing(status);
  }

  @ApiOperation({ summary: 'Get weight pricing by ID' })
  @Get('weight/:id')
  async getWeightPricingById(@Param('id') id: string) {
    return await this.pricingService.getWeightPricingById(id);
  }

  @ApiOperation({ summary: 'Create weight pricing tier' })
  @ApiBody({ type: CreateWeightPricingDto })
  @Post('weight')
  async createWeightPricing(@Body() body: CreateWeightPricingDto) {
    return await this.pricingService.createWeightPricing(body);
  }

  @ApiOperation({ summary: 'Update weight pricing tier' })
  @ApiBody({ type: UpdateWeightPricingDto })
  @Put('weight/:id')
  async updateWeightPricing(
    @Param('id') id: string,
    @Body() body: UpdateWeightPricingDto,
  ) {
    return await this.pricingService.updateWeightPricing(id, body);
  }

  @ApiOperation({ summary: 'Delete weight pricing tier' })
  @Delete('weight/:id')
  async deleteWeightPricing(@Param('id') id: string) {
    return await this.pricingService.deleteWeightPricing(id);
  }

  // ============ Time Pricing ============

  @ApiOperation({ summary: 'Get all time pricing slots' })
  @ApiQuery({ name: 'status', required: false })
  @Get('time')
  async getAllTimePricing(@Query('status') status?: string) {
    return await this.pricingService.getAllTimePricing(status);
  }

  @ApiOperation({ summary: 'Get time pricing by ID' })
  @Get('time/:id')
  async getTimePricingById(@Param('id') id: string) {
    return await this.pricingService.getTimePricingById(id);
  }

  @ApiOperation({ summary: 'Create time pricing slot' })
  @ApiBody({ type: CreateTimePricingDto })
  @Post('time')
  async createTimePricing(@Body() body: CreateTimePricingDto) {
    return await this.pricingService.createTimePricing(body);
  }

  @ApiOperation({ summary: 'Update time pricing slot' })
  @ApiBody({ type: UpdateTimePricingDto })
  @Put('time/:id')
  async updateTimePricing(
    @Param('id') id: string,
    @Body() body: UpdateTimePricingDto,
  ) {
    return await this.pricingService.updateTimePricing(id, body);
  }

  @ApiOperation({ summary: 'Delete time pricing slot' })
  @Delete('time/:id')
  async deleteTimePricing(@Param('id') id: string) {
    return await this.pricingService.deleteTimePricing(id);
  }

  // ============ Price Calculator ============

  @ApiOperation({ summary: 'Calculate delivery price (preview)' })
  @Post('calculate')
  async calculatePrice(
    @Body()
    body: {
      pickupLatitude: string;
      pickupLongitude: string;
      dropoffLatitude: string;
      dropoffLongitude: string;
      weightKg: number;
      deliveryType: string;
      scheduledTime?: string;
    },
  ) {
    return await this.pricingService.calculatePrice(body);
  }
}
