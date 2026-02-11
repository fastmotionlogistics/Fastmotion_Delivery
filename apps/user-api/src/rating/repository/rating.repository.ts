import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import {
  Rating,
  RatingDocument,
  DeliveryRequest,
  DeliveryRequestDocument,
  Rider,
  RiderDocument,
} from '@libs/database';

@Injectable()
export class RatingRepository {
  constructor(
    @InjectModel(Rating.name)
    readonly ratingModel: Model<RatingDocument>,
    @InjectModel(DeliveryRequest.name)
    readonly deliveryModel: Model<DeliveryRequestDocument>,
    @InjectModel(Rider.name)
    readonly riderModel: Model<RiderDocument>,
  ) {}

  // Rating methods
  async create(data: Partial<Rating>): Promise<Rating> {
    const rating = new this.ratingModel({
      ...data,
      _id: new Types.ObjectId(),
    });
    return rating.save();
  }

  async findById(id: string | Types.ObjectId): Promise<Rating | null> {
    return this.ratingModel.findById(id).lean();
  }

  async findByIdWithRelations(id: string | Types.ObjectId): Promise<Rating | null> {
    return this.ratingModel
      .findById(id)
      .populate('customer', 'firstName lastName profilePhoto')
      .populate('rider', 'firstName lastName profilePhoto averageRating')
      .populate('deliveryRequest', 'trackingNumber status')
      .lean();
  }

  async findByDeliveryRequest(
    deliveryRequestId: Types.ObjectId,
  ): Promise<Rating | null> {
    return this.ratingModel
      .findOne({ deliveryRequest: deliveryRequestId })
      .lean();
  }

  async findByCustomer(
    customerId: Types.ObjectId,
    filters: { page?: number; limit?: number } = {},
  ): Promise<{ data: Rating[]; total: number }> {
    const { page = 1, limit = 20 } = filters;
    const query: FilterQuery<Rating> = { customer: customerId };

    const [data, total] = await Promise.all([
      this.ratingModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('rider', 'firstName lastName profilePhoto')
        .populate('deliveryRequest', 'trackingNumber status')
        .lean(),
      this.ratingModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async findByRider(
    riderId: Types.ObjectId,
    filters: { page?: number; limit?: number } = {},
  ): Promise<{ data: Rating[]; total: number }> {
    const { page = 1, limit = 20 } = filters;
    const query: FilterQuery<Rating> = { rider: riderId, isVisible: true };

    const [data, total] = await Promise.all([
      this.ratingModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('customer', 'firstName lastName profilePhoto')
        .populate('deliveryRequest', 'trackingNumber')
        .lean(),
      this.ratingModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async updateById(
    id: string | Types.ObjectId,
    update: Partial<Rating>,
  ): Promise<Rating | null> {
    return this.ratingModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .lean();
  }

  async deleteById(id: string | Types.ObjectId): Promise<boolean> {
    const result = await this.ratingModel.findByIdAndDelete(id);
    return result !== null;
  }

  // Calculate rider average rating
  async calculateRiderAverageRating(riderId: Types.ObjectId): Promise<{
    averageRating: number;
    totalRatings: number;
  }> {
    const result = await this.ratingModel.aggregate([
      { $match: { rider: riderId, isVisible: true } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$score' },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    if (result.length === 0) {
      return { averageRating: 0, totalRatings: 0 };
    }

    return {
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      totalRatings: result[0].totalRatings,
    };
  }

  // Delivery methods
  async findDeliveryById(
    id: string | Types.ObjectId,
  ): Promise<DeliveryRequest | null> {
    return this.deliveryModel.findById(id).lean();
  }

  async updateDeliveryRating(
    id: string | Types.ObjectId,
    ratingId: Types.ObjectId,
  ): Promise<DeliveryRequest | null> {
    return this.deliveryModel
      .findByIdAndUpdate(
        id,
        { $set: { rating: ratingId, isRated: true } },
        { new: true },
      )
      .lean();
  }

  // Rider methods
  async updateRiderRating(
    riderId: Types.ObjectId,
    averageRating: number,
    totalRatings: number,
  ): Promise<Rider | null> {
    return this.riderModel
      .findByIdAndUpdate(
        riderId,
        {
          $set: {
            averageRating,
            totalRatings,
          },
        },
        { new: true },
      )
      .lean();
  }

  async getRiderRatingStats(riderId: Types.ObjectId): Promise<{
    distribution: { [key: number]: number };
    categoryAverages: {
      punctuality: number;
      professionalism: number;
      communication: number;
      parcelHandling: number;
    };
    topPositiveTags: { tag: string; count: number }[];
    topNegativeTags: { tag: string; count: number }[];
  }> {
    // Rating distribution
    const distribution = await this.ratingModel.aggregate([
      { $match: { rider: riderId, isVisible: true } },
      {
        $group: {
          _id: '$score',
          count: { $sum: 1 },
        },
      },
    ]);

    // Category averages
    const categoryAverages = await this.ratingModel.aggregate([
      { $match: { rider: riderId, isVisible: true } },
      {
        $group: {
          _id: null,
          avgPunctuality: { $avg: '$punctualityRating' },
          avgProfessionalism: { $avg: '$professionalismRating' },
          avgCommunication: { $avg: '$communicationRating' },
          avgParcelHandling: { $avg: '$parcelHandlingRating' },
        },
      },
    ]);

    // Top positive tags
    const positiveTags = await this.ratingModel.aggregate([
      { $match: { rider: riderId, isVisible: true } },
      { $unwind: '$positiveTags' },
      {
        $group: {
          _id: '$positiveTags',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Top negative tags
    const negativeTags = await this.ratingModel.aggregate([
      { $match: { rider: riderId, isVisible: true } },
      { $unwind: '$negativeTags' },
      {
        $group: {
          _id: '$negativeTags',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const distributionMap: { [key: number]: number } = {};
    for (let i = 1; i <= 5; i++) {
      distributionMap[i] = 0;
    }
    distribution.forEach((item) => {
      distributionMap[item._id] = item.count;
    });

    const catAvg = categoryAverages[0] || {
      avgPunctuality: 0,
      avgProfessionalism: 0,
      avgCommunication: 0,
      avgParcelHandling: 0,
    };

    return {
      distribution: distributionMap,
      categoryAverages: {
        punctuality: Math.round((catAvg.avgPunctuality || 0) * 10) / 10,
        professionalism: Math.round((catAvg.avgProfessionalism || 0) * 10) / 10,
        communication: Math.round((catAvg.avgCommunication || 0) * 10) / 10,
        parcelHandling: Math.round((catAvg.avgParcelHandling || 0) * 10) / 10,
      },
      topPositiveTags: positiveTags.map((t) => ({ tag: t._id, count: t.count })),
      topNegativeTags: negativeTags.map((t) => ({ tag: t._id, count: t.count })),
    };
  }

  // Check if customer can rate (delivery must be completed)
  async canCustomerRate(
    customerId: Types.ObjectId,
    deliveryRequestId: Types.ObjectId,
  ): Promise<{ canRate: boolean; reason?: string }> {
    const delivery = await this.deliveryModel.findById(deliveryRequestId).lean();

    if (!delivery) {
      return { canRate: false, reason: 'Delivery not found' };
    }

    if (delivery.customer.toString() !== customerId.toString()) {
      return { canRate: false, reason: 'Not authorized to rate this delivery' };
    }

    if (!['completed', 'delivered'].includes(delivery.status)) {
      return { canRate: false, reason: 'Delivery must be completed before rating' };
    }

    if (delivery.isRated) {
      return { canRate: false, reason: 'This delivery has already been rated' };
    }

    if (!delivery.rider) {
      return { canRate: false, reason: 'No rider assigned to this delivery' };
    }

    return { canRate: true };
  }
}
