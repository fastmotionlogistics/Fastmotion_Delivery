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
import { RatingService } from './rating.service';
import { CreateRatingDto, UpdateRatingDto } from './dto';
import { CurrentUser, JwtAuthGuard } from '@libs/auth';
import { User } from '@libs/database';

@ApiTags('Rating')
@Controller('rating')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @ApiOperation({ summary: 'Submit a rating for a delivery' })
  @ApiBody({ type: CreateRatingDto })
  @Post()
  async createRating(@CurrentUser() user: User, @Body() body: CreateRatingDto) {
    return await this.ratingService.createRating(user, body);
  }

  @ApiOperation({ summary: 'Update an existing rating' })
  @ApiBody({ type: UpdateRatingDto })
  @Put(':id')
  async updateRating(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: UpdateRatingDto,
  ) {
    return await this.ratingService.updateRating(user, id, body);
  }

  @ApiOperation({ summary: 'Get rating by ID' })
  @Get(':id')
  async getRatingById(@CurrentUser() user: User, @Param('id') id: string) {
    return await this.ratingService.getRatingById(user, id);
  }

  @ApiOperation({ summary: 'Get rating for a specific delivery' })
  @Get('delivery/:deliveryId')
  async getRatingByDelivery(
    @CurrentUser() user: User,
    @Param('deliveryId') deliveryId: string,
  ) {
    return await this.ratingService.getRatingByDelivery(user, deliveryId);
  }

  @ApiOperation({ summary: 'Get all ratings submitted by the user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get()
  async getMyRatings(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.ratingService.getMyRatings(user, { page, limit });
  }

  @ApiOperation({ summary: 'Get available rating tags' })
  @Get('tags/available')
  async getAvailableTags() {
    return await this.ratingService.getAvailableTags();
  }
}
