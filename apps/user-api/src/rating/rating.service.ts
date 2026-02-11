import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
import { User } from '@libs/database';
import { RatingRepository } from './repository';
import { CreateRatingDto, UpdateRatingDto } from './dto';

@Injectable()
export class RatingService {
  private readonly positiveTags = [
    'friendly',
    'fast',
    'careful',
    'professional',
    'punctual',
    'communicative',
    'helpful',
    'polite',
    'well_packaged',
  ];

  private readonly negativeTags = [
    'late',
    'rude',
    'careless',
    'unprofessional',
    'poor_communication',
    'damaged_package',
    'wrong_location',
  ];

  constructor(
    private readonly ratingRepository: RatingRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createRating(user: User, body: CreateRatingDto) {
    const userId = new Types.ObjectId(user._id);
    const deliveryId = new Types.ObjectId(body.deliveryRequestId);

    // Check if customer can rate this delivery
    const canRate = await this.ratingRepository.canCustomerRate(userId, deliveryId);
    if (!canRate.canRate) {
      throw new BadRequestException(canRate.reason);
    }

    // Get delivery to get rider info
    const delivery = await this.ratingRepository.findDeliveryById(deliveryId);
    if (!delivery || !delivery.rider) {
      throw new BadRequestException('Cannot rate: rider information not found');
    }

    // Validate tags
    if (body.positiveTags && body.positiveTags.length > 0) {
      const invalidPositive = body.positiveTags.filter(
        (tag) => !this.positiveTags.includes(tag),
      );
      if (invalidPositive.length > 0) {
        throw new BadRequestException(
          `Invalid positive tags: ${invalidPositive.join(', ')}`,
        );
      }
    }

    if (body.negativeTags && body.negativeTags.length > 0) {
      const invalidNegative = body.negativeTags.filter(
        (tag) => !this.negativeTags.includes(tag),
      );
      if (invalidNegative.length > 0) {
        throw new BadRequestException(
          `Invalid negative tags: ${invalidNegative.join(', ')}`,
        );
      }
    }

    // Create rating
    const rating = await this.ratingRepository.create({
      deliveryRequest: deliveryId,
      customer: userId,
      rider: delivery.rider,
      score: body.score,
      comment: body.comment,
      punctualityRating: body.punctualityRating,
      professionalismRating: body.professionalismRating,
      communicationRating: body.communicationRating,
      parcelHandlingRating: body.parcelHandlingRating,
      positiveTags: body.positiveTags || [],
      negativeTags: body.negativeTags || [],
      isAnonymous: body.isAnonymous || false,
      isVisible: true,
    });

    // Update delivery with rating reference
    await this.ratingRepository.updateDeliveryRating(deliveryId, rating._id);

    // Update rider's average rating
    const { averageRating, totalRatings } =
      await this.ratingRepository.calculateRiderAverageRating(delivery.rider);
    await this.ratingRepository.updateRiderRating(
      delivery.rider,
      averageRating,
      totalRatings,
    );

    // Emit rating created event
    this.eventEmitter.emit('rating.created', {
      ratingId: rating._id,
      deliveryId,
      riderId: delivery.rider,
      customerId: userId,
      score: body.score,
    });

    return {
      success: true,
      message: 'Rating submitted successfully',
      data: {
        rating: {
          id: rating._id,
          score: rating.score,
          comment: rating.comment,
          positiveTags: rating.positiveTags,
          negativeTags: rating.negativeTags,
          createdAt: rating.createdAt,
        },
      },
    };
  }

  async updateRating(user: User, id: string, body: UpdateRatingDto) {
    const userId = new Types.ObjectId(user._id);

    // Find existing rating
    const rating = await this.ratingRepository.findById(id);
    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    // Verify ownership
    if (rating.customer.toString() !== userId.toString()) {
      throw new ForbiddenException('You can only update your own ratings');
    }

    // Check if rating can still be updated (within 24 hours)
    const createdAt = new Date(rating.createdAt!);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      throw new BadRequestException('Ratings can only be updated within 24 hours of creation');
    }

    // Update rating
    const updateData: Partial<typeof rating> = {};
    if (body.score !== undefined) {
      updateData.score = body.score;
    }
    if (body.comment !== undefined) {
      updateData.comment = body.comment;
    }

    const updatedRating = await this.ratingRepository.updateById(id, updateData);

    // Recalculate rider's average rating if score changed
    if (body.score !== undefined && body.score !== rating.score) {
      const { averageRating, totalRatings } =
        await this.ratingRepository.calculateRiderAverageRating(rating.rider);
      await this.ratingRepository.updateRiderRating(
        rating.rider,
        averageRating,
        totalRatings,
      );
    }

    return {
      success: true,
      message: 'Rating updated successfully',
      data: {
        rating: {
          id: updatedRating?._id,
          score: updatedRating?.score,
          comment: updatedRating?.comment,
          updatedAt: updatedRating?.updatedAt,
        },
      },
    };
  }

  async getRatingById(user: User, id: string) {
    const userId = new Types.ObjectId(user._id);

    const rating = await this.ratingRepository.findByIdWithRelations(id);
    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    // Check if user has access (customer who created it)
    if (rating.customer.toString() !== userId.toString()) {
      throw new ForbiddenException('You do not have access to this rating');
    }

    return {
      success: true,
      message: 'Rating retrieved',
      data: {
        rating: {
          id: rating._id,
          score: rating.score,
          comment: rating.comment,
          punctualityRating: rating.punctualityRating,
          professionalismRating: rating.professionalismRating,
          communicationRating: rating.communicationRating,
          parcelHandlingRating: rating.parcelHandlingRating,
          positiveTags: rating.positiveTags,
          negativeTags: rating.negativeTags,
          isAnonymous: rating.isAnonymous,
          rider: rating.rider,
          deliveryRequest: rating.deliveryRequest,
          riderResponse: rating.riderResponse,
          riderRespondedAt: rating.riderRespondedAt,
          createdAt: rating.createdAt,
          updatedAt: rating.updatedAt,
        },
      },
    };
  }

  async getRatingByDelivery(user: User, deliveryId: string) {
    const userId = new Types.ObjectId(user._id);
    const deliveryObjectId = new Types.ObjectId(deliveryId);

    // Verify delivery ownership
    const delivery = await this.ratingRepository.findDeliveryById(deliveryObjectId);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.customer.toString() !== userId.toString()) {
      throw new ForbiddenException('You do not have access to this delivery');
    }

    const rating = await this.ratingRepository.findByDeliveryRequest(deliveryObjectId);
    if (!rating) {
      return {
        success: true,
        message: 'No rating found for this delivery',
        data: {
          rated: false,
          rating: null,
        },
      };
    }

    return {
      success: true,
      message: 'Rating retrieved',
      data: {
        rated: true,
        rating: {
          id: rating._id,
          score: rating.score,
          comment: rating.comment,
          positiveTags: rating.positiveTags,
          negativeTags: rating.negativeTags,
          createdAt: rating.createdAt,
        },
      },
    };
  }

  async getMyRatings(user: User, filters: { page?: number; limit?: number }) {
    const userId = new Types.ObjectId(user._id);

    const { data, total } = await this.ratingRepository.findByCustomer(userId, filters);

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    return {
      success: true,
      message: 'Ratings retrieved',
      data: {
        ratings: data.map((rating) => ({
          id: rating._id,
          score: rating.score,
          comment: rating.comment,
          positiveTags: rating.positiveTags,
          negativeTags: rating.negativeTags,
          rider: rating.rider,
          deliveryRequest: rating.deliveryRequest,
          createdAt: rating.createdAt,
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getAvailableTags() {
    return {
      success: true,
      message: 'Tags retrieved',
      data: {
        positiveTags: this.positiveTags.map((tag) => ({
          value: tag,
          label: tag.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        })),
        negativeTags: this.negativeTags.map((tag) => ({
          value: tag,
          label: tag.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        })),
      },
    };
  }

  // Additional helper method to check if delivery can be rated
  async canRateDelivery(user: User, deliveryId: string) {
    const userId = new Types.ObjectId(user._id);
    const deliveryObjectId = new Types.ObjectId(deliveryId);

    const canRate = await this.ratingRepository.canCustomerRate(
      userId,
      deliveryObjectId,
    );

    return {
      success: true,
      message: canRate.canRate ? 'Delivery can be rated' : canRate.reason,
      data: {
        canRate: canRate.canRate,
        reason: canRate.reason,
      },
    };
  }
}
