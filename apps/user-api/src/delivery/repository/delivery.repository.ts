import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import {
  DeliveryRequest,
  DeliveryRequestDocument,
  Coupon,
  CouponDocument,
  LocationZone,
  LocationZoneDocument,
  WeightPricing,
  WeightPricingDocument,
  TimePricing,
  TimePricingDocument,
  PricingConfig,
  PricingConfigDocument,
  Rider,
  RiderDocument,
  ItemCategory,
  ItemCategoryDocument,
  SpecialHandling,
  SpecialHandlingDocument,
} from '@libs/database';

@Injectable()
export class DeliveryRepository {
  constructor(
    @InjectModel(DeliveryRequest.name)
    readonly deliveryModel: Model<DeliveryRequestDocument>,
    @InjectModel(Coupon.name)
    readonly couponModel: Model<CouponDocument>,
    @InjectModel(LocationZone.name)
    readonly zoneModel: Model<LocationZoneDocument>,
    @InjectModel(WeightPricing.name)
    readonly weightPricingModel: Model<WeightPricingDocument>,
    @InjectModel(TimePricing.name)
    readonly timePricingModel: Model<TimePricingDocument>,
    @InjectModel(PricingConfig.name)
    readonly pricingConfigModel: Model<PricingConfigDocument>,
    @InjectModel(Rider.name)
    readonly riderModel: Model<RiderDocument>,
    @InjectModel(ItemCategory.name)
    readonly itemCategoryModel: Model<ItemCategoryDocument>,
    @InjectModel(SpecialHandling.name)
    readonly specialHandlingModel: Model<SpecialHandlingDocument>,
  ) {}

  // Item Category methods
  async findActiveCategories() {
    return this.itemCategoryModel.find({ status: 'active' }).sort({ sortOrder: 1 }).lean();
  }

  async findCategoryBySlug(slug: string): Promise<ItemCategory | null> {
    return this.itemCategoryModel.findOne({ slug, status: 'active' }).lean();
  }

  // Special Handling methods
  async findActiveHandling() {
    return this.specialHandlingModel.find({ status: 'active' }).sort({ sortOrder: 1 }).lean();
  }

  async findHandlingBySlugs(slugs: string[]) {
    if (!slugs || slugs.length === 0) return [];
    return this.specialHandlingModel.find({ slug: { $in: slugs }, status: 'active' }).lean();
  }

  async create(data: Partial<DeliveryRequest>): Promise<DeliveryRequest> {
    const delivery = new this.deliveryModel({
      ...data,
      _id: new Types.ObjectId(),
    });
    return delivery.save();
  }

  async findById(id: string | Types.ObjectId): Promise<DeliveryRequest | null> {
    return this.deliveryModel.findById(id).lean();
  }

  async findByIdWithRelations(
    id: string | Types.ObjectId,
    populate: string[] = [],
  ): Promise<DeliveryRequest | null> {
    let query = this.deliveryModel.findById(id);
    populate.forEach((field) => {
      query = query.populate(field);
    });
    return query.lean();
  }

  async findByIdWithPins(id: string | Types.ObjectId): Promise<DeliveryRequest | null> {
    return this.deliveryModel
      .findById(id)
      .select('+pickupPin +deliveryPin')
      .lean();
  }

  async findByTrackingNumber(trackingNumber: string): Promise<DeliveryRequest | null> {
    return this.deliveryModel.findOne({ trackingNumber }).lean();
  }

  async findByCustomer(
    customerId: Types.ObjectId,
    filters: {
      status?: string;
      deliveryType?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: DeliveryRequest[]; total: number }> {
    const { status, deliveryType, search, dateFrom, dateTo, page = 1, limit = 20 } = filters;
    const query: FilterQuery<DeliveryRequest> = { customer: customerId };

    if (status) {
      query.status = status;
    }

    if (deliveryType) {
      query.deliveryType = deliveryType;
    }

    // Search by tracking number (case-insensitive partial match)
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.trackingNumber = { $regex: escaped, $options: 'i' } as any;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {} as any;
      if (dateFrom) (query.createdAt as any).$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        (query.createdAt as any).$lte = end;
      }
    }

    const [data, total] = await Promise.all([
      this.deliveryModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('rider', 'firstName lastName profilePhoto vehicleType averageRating')
        .lean(),
      this.deliveryModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async findCompletedByCustomer(
    customerId: Types.ObjectId,
    filters: { page?: number; limit?: number } = {},
  ): Promise<{ data: DeliveryRequest[]; total: number }> {
    const { page = 1, limit = 20 } = filters;
    const query: FilterQuery<DeliveryRequest> = {
      customer: customerId,
      status: { $in: ['completed', 'delivered', 'cancelled'] },
    };

    const [data, total] = await Promise.all([
      this.deliveryModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('rider', 'firstName lastName profilePhoto')
        .lean(),
      this.deliveryModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async updateById(
    id: string | Types.ObjectId,
    update: Partial<DeliveryRequest>,
  ): Promise<DeliveryRequest | null> {
    return this.deliveryModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .lean();
  }

  async updateStatus(
    id: string | Types.ObjectId,
    status: string,
    additionalFields: Partial<DeliveryRequest> = {},
  ): Promise<DeliveryRequest | null> {
    return this.deliveryModel
      .findByIdAndUpdate(
        id,
        { $set: { status, ...additionalFields } },
        { new: true },
      )
      .lean();
  }

  async addRescheduleHistory(
    id: string | Types.ObjectId,
    historyEntry: any,
  ): Promise<DeliveryRequest | null> {
    return this.deliveryModel
      .findByIdAndUpdate(
        id,
        {
          $push: { rescheduleHistory: historyEntry },
          $inc: { rescheduleCount: 1 },
          $set: { isRescheduled: true },
        },
        { new: true },
      )
      .lean();
  }

  // Coupon methods
  async findCouponByCode(code: string): Promise<Coupon | null> {
    return this.couponModel.findOne({
      code: code.toUpperCase(),
      status: 'active',
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() },
    }).lean();
  }

  async incrementCouponUsage(couponId: Types.ObjectId): Promise<void> {
    await this.couponModel.findByIdAndUpdate(couponId, {
      $inc: { currentUsageCount: 1 },
    });
  }

  // Zone methods
  async findZoneByCoordinates(
    latitude: number,
    longitude: number,
  ): Promise<LocationZone | null> {
    const zones = await this.zoneModel
      .find({ status: 'active' })
      .sort({ priority: -1 })
      .lean();

    for (const zone of zones) {
      if (zone.centerPoint && zone.radiusKm) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          zone.centerPoint.latitude,
          zone.centerPoint.longitude,
        );
        if (distance <= zone.radiusKm) {
          return zone;
        }
      }
    }
    return null;
  }

  // Weight pricing methods
  async findWeightPricing(weightKg: number): Promise<WeightPricing | null> {
    return this.weightPricingModel
      .findOne({
        status: 'active',
        minWeightKg: { $lte: weightKg },
        maxWeightKg: { $gt: weightKg },
      })
      .lean();
  }

  // Time pricing methods
  async findTimePricing(date: Date): Promise<TimePricing | null> {
    const dayOfWeek = this.getDayOfWeek(date);
    const timeString = this.getTimeString(date);

    return this.timePricingModel
      .findOne({
        status: 'active',
        daysOfWeek: dayOfWeek,
        startTime: { $lte: timeString },
        endTime: { $gt: timeString },
      })
      .sort({ priority: -1 })
      .lean();
  }

  // Pricing config methods
  async getActivePricingConfig(): Promise<PricingConfig | null> {
    return this.pricingConfigModel
      .findOne({
        isActive: true,
        $or: [
          { effectiveFrom: { $lte: new Date() }, effectiveUntil: { $gte: new Date() } },
          { effectiveFrom: { $lte: new Date() }, effectiveUntil: null },
          { effectiveFrom: null },
        ],
      })
      .lean();
  }

  // Rider methods
  async findRiderById(riderId: Types.ObjectId): Promise<Rider | null> {
    return this.riderModel.findById(riderId).lean();
  }

  async findRiderPublicInfo(riderId: Types.ObjectId): Promise<Partial<Rider> | null> {
    return this.riderModel
      .findById(riderId)
      .select('firstName lastName profilePhoto vehicleType vehiclePlateNumber averageRating currentLatitude currentLongitude')
      .lean();
  }

  // Helper methods
  /**
   * Generate a tracking number in the format FM-XXXX-XX
   * e.g. FM-KJHS-3H, FM-A9BZ-7K
   * Uses alphanumeric chars (no 0/O/I/1 to avoid confusion)
   */
  generateTrackingNumber(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const pick = (len: number) => {
      let s = '';
      for (let i = 0; i < len; i++) {
        s += chars[Math.floor(Math.random() * chars.length)];
      }
      return s;
    };
    return `FM-${pick(4)}-${pick(2)}`;
  }

  generatePin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  private getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  private getTimeString(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  estimateDuration(distanceKm: number): number {
    const averageSpeedKmH = 30;
    return Math.ceil((distanceKm / averageSpeedKmH) * 60);
  }
}
