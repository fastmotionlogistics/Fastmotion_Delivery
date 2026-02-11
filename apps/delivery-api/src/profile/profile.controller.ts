import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import {
  UpdateProfileDto,
  UpdateVehicleDto,
  UploadDocumentDto,
  UpdateBankDetailsDto,
  UpdateLocationDto,
  UpdateFcmTokenDto,
} from './dto';
import { Rider } from '@libs/database';
import { RiderJwtAuthGuard } from '../auth/guards';
import { CurrentRider } from '../auth/decorators/current-rider.decorator';

@ApiTags('Rider Profile')
@Controller('profile')
@UseGuards(RiderJwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOperation({ summary: 'Get rider profile' })
  @Get()
  async getProfile(@CurrentRider() rider: Rider) {
    return await this.profileService.getProfile(rider);
  }

  @ApiOperation({ summary: 'Update rider profile' })
  @ApiBody({ type: UpdateProfileDto })
  @Put()
  async updateProfile(@CurrentRider() rider: Rider, @Body() body: UpdateProfileDto) {
    return await this.profileService.updateProfile(rider, body);
  }

  @ApiOperation({ summary: 'Update vehicle information' })
  @ApiBody({ type: UpdateVehicleDto })
  @Patch('vehicle')
  async updateVehicle(@CurrentRider() rider: Rider, @Body() body: UpdateVehicleDto) {
    return await this.profileService.updateVehicle(rider, body);
  }

  @ApiOperation({ summary: 'Upload document' })
  @ApiBody({ type: UploadDocumentDto })
  @Patch('document')
  async uploadDocument(@CurrentRider() rider: Rider, @Body() body: UploadDocumentDto) {
    return await this.profileService.uploadDocument(rider, body);
  }

  @ApiOperation({ summary: 'Update bank details' })
  @ApiBody({ type: UpdateBankDetailsDto })
  @Patch('bank-details')
  async updateBankDetails(@CurrentRider() rider: Rider, @Body() body: UpdateBankDetailsDto) {
    return await this.profileService.updateBankDetails(rider, body);
  }

  @ApiOperation({ summary: 'Update current location' })
  @ApiBody({ type: UpdateLocationDto })
  @Patch('location')
  async updateLocation(@CurrentRider() rider: Rider, @Body() body: UpdateLocationDto) {
    return await this.profileService.updateLocation(rider, body);
  }

  @ApiOperation({ summary: 'Update FCM token' })
  @ApiBody({ type: UpdateFcmTokenDto })
  @Patch('fcm-token')
  async updateFcmToken(@CurrentRider() rider: Rider, @Body() body: UpdateFcmTokenDto) {
    return await this.profileService.updateFcmToken(rider, body);
  }

  @ApiOperation({ summary: 'Get verification status' })
  @Get('verification-status')
  async getVerificationStatus(@CurrentRider() rider: Rider) {
    return await this.profileService.getVerificationStatus(rider);
  }

  @ApiOperation({ summary: 'Get rider statistics' })
  @Get('stats')
  async getRiderStats(@CurrentRider() rider: Rider) {
    return await this.profileService.getRiderStats(rider);
  }
}
