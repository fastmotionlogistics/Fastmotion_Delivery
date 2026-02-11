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
  AcceptDeliveryDto,
  RejectDeliveryDto,
  UpdateDeliveryStatusDto,
  VerifyPickupPinDto,
  VerifyDeliveryPinDto,
  UpdateRiderLocationDto,
} from './dto';
import { Rider } from '@libs/database';
import { RiderJwtAuthGuard } from '../auth/guards';
import { CurrentRider } from '../auth/decorators/current-rider.decorator';

@ApiTags('Rider Deliveries')
@Controller('delivery')
@UseGuards(RiderJwtAuthGuard)
@ApiBearerAuth()
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @ApiOperation({ summary: 'Get available delivery requests nearby' })
  @ApiQuery({ name: 'latitude', required: false })
  @ApiQuery({ name: 'longitude', required: false })
  @ApiQuery({ name: 'radius', required: false, description: 'Radius in km' })
  @Get('available')
  async getAvailableDeliveries(
    @CurrentRider() rider: Rider,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('radius') radius?: number,
  ) {
    return await this.deliveryService.getAvailableDeliveries(rider, {
      latitude,
      longitude,
      radius,
    });
  }

  @ApiOperation({ summary: 'Get rider\'s active deliveries' })
  @Get('active')
  async getActiveDeliveries(@CurrentRider() rider: Rider) {
    return await this.deliveryService.getActiveDeliveries(rider);
  }

  @ApiOperation({ summary: 'Get rider\'s delivery history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get('history')
  async getDeliveryHistory(
    @CurrentRider() rider: Rider,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.deliveryService.getDeliveryHistory(rider, { page, limit });
  }

  @ApiOperation({ summary: 'Get delivery request details' })
  @Get(':id')
  async getDeliveryById(@CurrentRider() rider: Rider, @Param('id') id: string) {
    return await this.deliveryService.getDeliveryById(rider, id);
  }

  @ApiOperation({ summary: 'Accept a delivery request' })
  @ApiBody({ type: AcceptDeliveryDto })
  @Post('accept')
  async acceptDelivery(@CurrentRider() rider: Rider, @Body() body: AcceptDeliveryDto) {
    return await this.deliveryService.acceptDelivery(rider, body);
  }

  @ApiOperation({ summary: 'Reject a delivery request' })
  @ApiBody({ type: RejectDeliveryDto })
  @Post('reject')
  async rejectDelivery(@CurrentRider() rider: Rider, @Body() body: RejectDeliveryDto) {
    return await this.deliveryService.rejectDelivery(rider, body);
  }

  @ApiOperation({ summary: 'Update delivery status' })
  @ApiBody({ type: UpdateDeliveryStatusDto })
  @Patch(':id/status')
  async updateDeliveryStatus(
    @CurrentRider() rider: Rider,
    @Param('id') id: string,
    @Body() body: UpdateDeliveryStatusDto,
  ) {
    return await this.deliveryService.updateDeliveryStatus(rider, id, body);
  }

  @ApiOperation({ summary: 'Verify pickup PIN' })
  @ApiBody({ type: VerifyPickupPinDto })
  @Post(':id/verify-pickup')
  async verifyPickupPin(
    @CurrentRider() rider: Rider,
    @Param('id') id: string,
    @Body() body: VerifyPickupPinDto,
  ) {
    return await this.deliveryService.verifyPickupPin(rider, id, body);
  }

  @ApiOperation({ summary: 'Verify delivery PIN and complete delivery' })
  @ApiBody({ type: VerifyDeliveryPinDto })
  @Post(':id/verify-delivery')
  async verifyDeliveryPin(
    @CurrentRider() rider: Rider,
    @Param('id') id: string,
    @Body() body: VerifyDeliveryPinDto,
  ) {
    return await this.deliveryService.verifyDeliveryPin(rider, id, body);
  }

  @ApiOperation({ summary: 'Update rider location during delivery' })
  @ApiBody({ type: UpdateRiderLocationDto })
  @Patch(':id/location')
  async updateRiderLocation(
    @CurrentRider() rider: Rider,
    @Param('id') id: string,
    @Body() body: UpdateRiderLocationDto,
  ) {
    return await this.deliveryService.updateRiderLocation(rider, id, body);
  }

  @ApiOperation({ summary: 'Mark as arrived at pickup' })
  @Post(':id/arrived-pickup')
  async arrivedAtPickup(@CurrentRider() rider: Rider, @Param('id') id: string) {
    return await this.deliveryService.arrivedAtPickup(rider, id);
  }

  @ApiOperation({ summary: 'Mark as arrived at dropoff' })
  @Post(':id/arrived-dropoff')
  async arrivedAtDropoff(@CurrentRider() rider: Rider, @Param('id') id: string) {
    return await this.deliveryService.arrivedAtDropoff(rider, id);
  }

  @ApiOperation({ summary: 'Toggle rider online/offline status' })
  @Patch('status/toggle')
  async toggleOnlineStatus(@CurrentRider() rider: Rider) {
    return await this.deliveryService.toggleOnlineStatus(rider);
  }

  @ApiOperation({ summary: 'Get today\'s summary' })
  @Get('summary/today')
  async getTodaySummary(@CurrentRider() rider: Rider) {
    return await this.deliveryService.getTodaySummary(rider);
  }
}
