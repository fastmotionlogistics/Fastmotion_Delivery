import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PricingConfig,
  PricingConfigDocument,
  LocationZone,
  LocationZoneDocument,
  ZoneStatusEnum,
  WeightPricing,
  WeightPricingDocument,
  WeightPricingStatusEnum,
  TimePricing,
  TimePricingDocument,
  TimePricingStatusEnum,
} from '@libs/database';
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

@Injectable()
export class PricingService {
  constructor(
    @InjectModel(PricingConfig.name)
    private readonly pricingConfigModel: Model<PricingConfigDocument>,
    @InjectModel(LocationZone.name)
    private readonly zoneModel: Model<LocationZoneDocument>,
    @InjectModel(WeightPricing.name)
    private readonly weightPricingModel: Model<WeightPricingDocument>,
    @InjectModel(TimePricing.name)
    private readonly timePricingModel: Model<TimePricingDocument>,
  ) {}

  // ═══════════════════════════════════════════════
  //  PRICING CONFIG
  // ═══════════════════════════════════════════════

  async getActivePricingConfig() {
    const config = await this.pricingConfigModel
      .findOne({
        isActive: true,
        $or: [
          { effectiveFrom: { $lte: new Date() }, effectiveUntil: { $gte: new Date() } },
          { effectiveFrom: { $lte: new Date() }, effectiveUntil: null },
          { effectiveFrom: null },
        ],
      })
      .lean();

    return {
      success: true,
      message: config ? 'Active pricing config retrieved' : 'No active pricing config found',
      data: config,
    };
  }

  async getAllPricingConfigs() {
    const configs = await this.pricingConfigModel
      .find()
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      message: 'All pricing configs retrieved',
      data: configs,
    };
  }

  async createPricingConfig(body: CreatePricingConfigDto) {
    // If this should be active, deactivate all other active configs
    const newConfig = await this.pricingConfigModel.create({
      _id: new Types.ObjectId(),
      currency: body.currency || 'NGN',
      currencySymbol: body.currencySymbol || '₦',
      baseDeliveryFee: body.baseDeliveryFee,
      pricePerKm: body.pricePerKm,
      pricePerMinute: body.pricePerMinute || 0,
      minimumDeliveryFee: body.minimumDeliveryFee,
      maximumDeliveryFee: body.maximumDeliveryFee,
      quickDeliveryMultiplier: body.quickDeliveryMultiplier ?? 1.0,
      scheduledDeliveryMultiplier: body.scheduledDeliveryMultiplier ?? 1.0,
      interZoneMultiplier: body.interZoneMultiplier ?? 1.0,
      serviceFeePercentage: body.serviceFeePercentage ?? 0,
      minimumServiceFee: body.minimumServiceFee ?? 0,
      maximumServiceFee: body.maximumServiceFee,
      parcelProtectionPercentage: body.parcelProtectionPercentage ?? 0,
      cancellationFeeBeforeAccept: body.cancellationFeeBeforeAccept ?? 0,
      cancellationFeeAfterAccept: body.cancellationFeeAfterAccept ?? 0,
      cancellationFeeAfterPickupPercentage: body.cancellationFeeAfterPickupPercentage ?? 0.5,
      reschedulingFee: body.reschedulingFee ?? 0,
      isActive: true,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
      effectiveUntil: body.effectiveUntil ? new Date(body.effectiveUntil) : undefined,
    });

    // Deactivate all other configs
    await this.pricingConfigModel.updateMany(
      { _id: { $ne: newConfig._id }, isActive: true },
      { $set: { isActive: false } },
    );

    return {
      success: true,
      message: 'Pricing config created and set as active',
      data: newConfig,
    };
  }

  async updatePricingConfig(id: string, body: UpdatePricingConfigDto) {
    const config = await this.pricingConfigModel.findById(id);
    if (!config) throw new NotFoundException('Pricing config not found');

    const updateData: any = { ...body };
    if (body.effectiveFrom) updateData.effectiveFrom = new Date(body.effectiveFrom);
    if (body.effectiveUntil) updateData.effectiveUntil = new Date(body.effectiveUntil);

    // If activating this config, deactivate others
    if (body.isActive === true) {
      await this.pricingConfigModel.updateMany(
        { _id: { $ne: id }, isActive: true },
        { $set: { isActive: false } },
      );
    }

    await this.pricingConfigModel.updateOne({ _id: id }, { $set: updateData });

    const updated = await this.pricingConfigModel.findById(id).lean();

    return {
      success: true,
      message: 'Pricing config updated',
      data: updated,
    };
  }

  // ═══════════════════════════════════════════════
  //  LOCATION ZONES
  // ═══════════════════════════════════════════════

  async getAllZones(status?: string) {
    const query: any = {};
    if (status) query.status = status;

    const zones = await this.zoneModel
      .find(query)
      .sort({ priority: -1, name: 1 })
      .populate('linkedZones', 'name code')
      .lean();

    return {
      success: true,
      message: 'Zones retrieved',
      data: zones,
    };
  }

  async getZoneById(id: string) {
    const zone = await this.zoneModel
      .findById(id)
      .populate('linkedZones', 'name code priceMultiplier status')
      .lean();

    if (!zone) throw new NotFoundException('Zone not found');

    return { success: true, message: 'Zone retrieved', data: zone };
  }

  async createZone(body: CreateLocationZoneDto) {
    // Check code uniqueness
    const existing = await this.zoneModel.findOne({ code: body.code.toUpperCase() });
    if (existing) throw new ConflictException(`Zone with code "${body.code}" already exists`);

    const zone = await this.zoneModel.create({
      _id: new Types.ObjectId(),
      name: body.name,
      code: body.code.toUpperCase(),
      description: body.description,
      boundaries: body.boundaries,
      centerPoint: body.centerPoint,
      radiusKm: body.radiusKm,
      priceMultiplier: body.priceMultiplier,
      baseFee: body.baseFee ?? 0,
      pricePerKm: body.pricePerKm,
      priority: body.priority ?? 1,
      status: ZoneStatusEnum.ACTIVE,
      allowInterZoneDelivery: body.allowInterZoneDelivery ?? true,
      linkedZones: body.linkedZones?.map((z) => new Types.ObjectId(z)) || [],
    });

    return {
      success: true,
      message: 'Zone created',
      data: zone,
    };
  }

  async updateZone(id: string, body: UpdateLocationZoneDto) {
    const zone = await this.zoneModel.findById(id);
    if (!zone) throw new NotFoundException('Zone not found');

    // Check code uniqueness if changing
    if (body.code && body.code.toUpperCase() !== zone.code) {
      const dup = await this.zoneModel.findOne({
        code: body.code.toUpperCase(),
        _id: { $ne: id },
      });
      if (dup) throw new ConflictException(`Zone with code "${body.code}" already exists`);
    }

    const updateData: any = { ...body };
    if (body.code) updateData.code = body.code.toUpperCase();
    if (body.linkedZones) {
      updateData.linkedZones = body.linkedZones.map((z) => new Types.ObjectId(z));
    }

    await this.zoneModel.updateOne({ _id: id }, { $set: updateData });

    const updated = await this.zoneModel.findById(id).lean();
    return { success: true, message: 'Zone updated', data: updated };
  }

  async deleteZone(id: string) {
    const zone = await this.zoneModel.findById(id);
    if (!zone) throw new NotFoundException('Zone not found');

    // Soft delete — set to inactive
    await this.zoneModel.updateOne(
      { _id: id },
      { $set: { status: ZoneStatusEnum.INACTIVE } },
    );

    // Remove from other zones' linkedZones
    await this.zoneModel.updateMany(
      { linkedZones: new Types.ObjectId(id) },
      { $pull: { linkedZones: new Types.ObjectId(id) } },
    );

    return { success: true, message: 'Zone deactivated' };
  }

  // ═══════════════════════════════════════════════
  //  WEIGHT PRICING
  // ═══════════════════════════════════════════════

  async getAllWeightPricing(status?: string) {
    const query: any = {};
    if (status) query.status = status;

    const tiers = await this.weightPricingModel
      .find(query)
      .sort({ sortOrder: 1, minWeightKg: 1 })
      .lean();

    return { success: true, message: 'Weight pricing tiers retrieved', data: tiers };
  }

  async getWeightPricingById(id: string) {
    const tier = await this.weightPricingModel.findById(id).lean();
    if (!tier) throw new NotFoundException('Weight pricing tier not found');
    return { success: true, message: 'Weight pricing retrieved', data: tier };
  }

  async createWeightPricing(body: CreateWeightPricingDto) {
    if (body.minWeightKg >= body.maxWeightKg) {
      throw new BadRequestException('minWeightKg must be less than maxWeightKg');
    }

    // Check for overlapping ranges among active tiers
    const overlapping = await this.weightPricingModel.findOne({
      status: WeightPricingStatusEnum.ACTIVE,
      $or: [
        { minWeightKg: { $lt: body.maxWeightKg }, maxWeightKg: { $gt: body.minWeightKg } },
      ],
    });

    if (overlapping) {
      throw new ConflictException(
        `Weight range ${body.minWeightKg}-${body.maxWeightKg}kg overlaps with "${overlapping.name}" (${overlapping.minWeightKg}-${overlapping.maxWeightKg}kg)`,
      );
    }

    const tier = await this.weightPricingModel.create({
      _id: new Types.ObjectId(),
      name: body.name,
      minWeightKg: body.minWeightKg,
      maxWeightKg: body.maxWeightKg,
      priceMultiplier: body.priceMultiplier,
      additionalFee: body.additionalFee ?? 0,
      description: body.description,
      sortOrder: body.sortOrder ?? 0,
      status: WeightPricingStatusEnum.ACTIVE,
    });

    return { success: true, message: 'Weight pricing tier created', data: tier };
  }

  async updateWeightPricing(id: string, body: UpdateWeightPricingDto) {
    const tier = await this.weightPricingModel.findById(id);
    if (!tier) throw new NotFoundException('Weight pricing tier not found');

    const minW = body.minWeightKg ?? tier.minWeightKg;
    const maxW = body.maxWeightKg ?? tier.maxWeightKg;

    if (minW >= maxW) {
      throw new BadRequestException('minWeightKg must be less than maxWeightKg');
    }

    // Check overlaps with other active tiers (excluding self)
    if (body.minWeightKg !== undefined || body.maxWeightKg !== undefined) {
      const overlapping = await this.weightPricingModel.findOne({
        _id: { $ne: id },
        status: WeightPricingStatusEnum.ACTIVE,
        minWeightKg: { $lt: maxW },
        maxWeightKg: { $gt: minW },
      });

      if (overlapping) {
        throw new ConflictException(
          `Weight range ${minW}-${maxW}kg overlaps with "${overlapping.name}" (${overlapping.minWeightKg}-${overlapping.maxWeightKg}kg)`,
        );
      }
    }

    await this.weightPricingModel.updateOne({ _id: id }, { $set: { ...body } });

    const updated = await this.weightPricingModel.findById(id).lean();
    return { success: true, message: 'Weight pricing tier updated', data: updated };
  }

  async deleteWeightPricing(id: string) {
    const tier = await this.weightPricingModel.findById(id);
    if (!tier) throw new NotFoundException('Weight pricing tier not found');

    await this.weightPricingModel.updateOne(
      { _id: id },
      { $set: { status: WeightPricingStatusEnum.INACTIVE } },
    );

    return { success: true, message: 'Weight pricing tier deactivated' };
  }

  // ═══════════════════════════════════════════════
  //  TIME PRICING
  // ═══════════════════════════════════════════════

  async getAllTimePricing(status?: string) {
    const query: any = {};
    if (status) query.status = status;

    const slots = await this.timePricingModel
      .find(query)
      .sort({ priority: -1, startTime: 1 })
      .lean();

    return { success: true, message: 'Time pricing slots retrieved', data: slots };
  }

  async getTimePricingById(id: string) {
    const slot = await this.timePricingModel.findById(id).lean();
    if (!slot) throw new NotFoundException('Time pricing slot not found');
    return { success: true, message: 'Time pricing retrieved', data: slot };
  }

  async createTimePricing(body: CreateTimePricingDto) {
    // Validate time range
    if (body.startTime >= body.endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }

    const slot = await this.timePricingModel.create({
      _id: new Types.ObjectId(),
      name: body.name,
      startTime: body.startTime,
      endTime: body.endTime,
      daysOfWeek: body.daysOfWeek || [
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
      ],
      priceMultiplier: body.priceMultiplier,
      additionalFee: body.additionalFee ?? 0,
      description: body.description,
      isPeakPeriod: body.isPeakPeriod ?? false,
      isDeliveryAvailable: body.isDeliveryAvailable ?? true,
      priority: body.priority ?? 1,
      status: TimePricingStatusEnum.ACTIVE,
    });

    return { success: true, message: 'Time pricing slot created', data: slot };
  }

  async updateTimePricing(id: string, body: UpdateTimePricingDto) {
    const slot = await this.timePricingModel.findById(id);
    if (!slot) throw new NotFoundException('Time pricing slot not found');

    const start = body.startTime ?? slot.startTime;
    const end = body.endTime ?? slot.endTime;

    if (start >= end) {
      throw new BadRequestException('startTime must be before endTime');
    }

    await this.timePricingModel.updateOne({ _id: id }, { $set: { ...body } });

    const updated = await this.timePricingModel.findById(id).lean();
    return { success: true, message: 'Time pricing slot updated', data: updated };
  }

  async deleteTimePricing(id: string) {
    const slot = await this.timePricingModel.findById(id);
    if (!slot) throw new NotFoundException('Time pricing slot not found');

    await this.timePricingModel.updateOne(
      { _id: id },
      { $set: { status: TimePricingStatusEnum.INACTIVE } },
    );

    return { success: true, message: 'Time pricing slot deactivated' };
  }

  // ═══════════════════════════════════════════════
  //  PRICE CALCULATOR (admin preview)
  // ═══════════════════════════════════════════════

  async calculatePrice(body: {
    pickupLatitude: string;
    pickupLongitude: string;
    dropoffLatitude: string;
    dropoffLongitude: string;
    size?: string;
    category?: string;
    deliveryType: string;
    scheduledTime?: string;
  }) {
    // 1. Get active pricing config
    const config = await this.pricingConfigModel
      .findOne({
        isActive: true,
        $or: [
          { effectiveFrom: { $lte: new Date() }, effectiveUntil: { $gte: new Date() } },
          { effectiveFrom: { $lte: new Date() }, effectiveUntil: null },
          { effectiveFrom: null },
        ],
      })
      .lean();

    if (!config) {
      throw new BadRequestException('No active pricing configuration found. Please create one first.');
    }

    // 2. Calculate distance (Haversine)
    const pickupLat = parseFloat(body.pickupLatitude);
    const pickupLng = parseFloat(body.pickupLongitude);
    const dropoffLat = parseFloat(body.dropoffLatitude);
    const dropoffLng = parseFloat(body.dropoffLongitude);

    const distance = this.calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
    const estimatedDuration = Math.ceil((distance / 30) * 60); // ~30 km/h average

    // 3. Determine zones
    const pickupZone = await this.findZoneByCoords(pickupLat, pickupLng);
    const dropoffZone = await this.findZoneByCoords(dropoffLat, dropoffLng);
    const isInterZone = pickupZone && dropoffZone &&
      pickupZone._id.toString() !== dropoffZone._id.toString();

    // 4. Get time pricing
    const scheduledDate = body.scheduledTime ? new Date(body.scheduledTime) : new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][scheduledDate.getDay()];
    const timeString = `${scheduledDate.getHours().toString().padStart(2, '0')}:${scheduledDate.getMinutes().toString().padStart(2, '0')}`;

    const timePricing = await this.timePricingModel
      .findOne({
        status: TimePricingStatusEnum.ACTIVE,
        daysOfWeek: dayOfWeek,
        startTime: { $lte: timeString },
        endTime: { $gt: timeString },
      })
      .sort({ priority: -1 })
      .lean();

    // 5. Calculate multipliers (weight removed — only size & category)
    const zoneMultiplier = pickupZone?.priceMultiplier || 1.0;
    const timeMultiplier = timePricing?.priceMultiplier || 1.0;
    const deliveryTypeMultiplier = body.deliveryType === 'quick'
      ? config.quickDeliveryMultiplier || 1.0
      : config.scheduledDeliveryMultiplier || 1.0;
    const interZoneMultiplier = isInterZone ? config.interZoneMultiplier || 1.0 : 1.0;

    // Size-based pricing
    const parcelSize = body.size || 'medium';
    const sizeFee = config.sizeFees?.[parcelSize] || 0;
    const sizeMultiplier = config.sizeMultipliers?.[parcelSize] || 1.0;

    // Category-based pricing
    const parcelCategory = body.category || 'other';
    const categoryMultiplier = config.categoryMultipliers?.[parcelCategory] || 1.0;

    // 6. Calculate prices
    const basePrice = config.baseDeliveryFee;
    const distancePrice = Math.round(distance * config.pricePerKm);
    const timePrice = timePricing?.additionalFee || 0;

    let subtotal = basePrice + distancePrice + timePrice + sizeFee;
    subtotal = Math.round(
      subtotal * sizeMultiplier * categoryMultiplier *
      zoneMultiplier * timeMultiplier *
      deliveryTypeMultiplier * interZoneMultiplier,
    );

    subtotal = Math.max(subtotal, config.minimumDeliveryFee);
    if (config.maximumDeliveryFee) {
      subtotal = Math.min(subtotal, config.maximumDeliveryFee);
    }

    // Service fee
    let serviceFee = Math.round(subtotal * (config.serviceFeePercentage || 0));
    serviceFee = Math.max(serviceFee, config.minimumServiceFee || 0);
    if (config.maximumServiceFee) {
      serviceFee = Math.min(serviceFee, config.maximumServiceFee);
    }

    const totalPrice = subtotal + serviceFee;

    return {
      success: true,
      message: 'Price calculated',
      data: {
        breakdown: {
          basePrice,
          distancePrice,
          sizeFee,
          timePrice,
          serviceFee,
          subtotal,
          totalPrice,
          currency: config.currency,
          currencySymbol: config.currencySymbol,
        },
        multipliers: {
          zone: zoneMultiplier,
          size: sizeMultiplier,
          category: categoryMultiplier,
          time: timeMultiplier,
          deliveryType: deliveryTypeMultiplier,
          interZone: interZoneMultiplier,
        },
        zones: {
          pickup: pickupZone ? { id: pickupZone._id, name: pickupZone.name, code: pickupZone.code } : null,
          dropoff: dropoffZone ? { id: dropoffZone._id, name: dropoffZone.name, code: dropoffZone.code } : null,
          isInterZone,
        },
        timeSlot: timePricing ? { id: timePricing._id, name: timePricing.name, isPeak: timePricing.isPeakPeriod } : null,
        estimatedDistance: Math.round(distance * 100) / 100,
        estimatedDuration,
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════

  private async findZoneByCoords(lat: number, lng: number): Promise<LocationZone | null> {
    const zones = await this.zoneModel
      .find({ status: ZoneStatusEnum.ACTIVE })
      .sort({ priority: -1 })
      .lean();

    for (const zone of zones) {
      if (zone.centerPoint && zone.radiusKm) {
        const dist = this.calculateDistance(
          lat, lng,
          zone.centerPoint.latitude,
          zone.centerPoint.longitude,
        );
        if (dist <= zone.radiusKm) return zone;
      }
    }
    return null;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
