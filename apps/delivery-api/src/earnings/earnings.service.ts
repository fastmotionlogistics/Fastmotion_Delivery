import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Rider,
  RiderDocument,
  RiderEarnings,
  RiderEarningsDocument,
  EarningsStatusEnum,
  EarningsTypeEnum,
  DeliveryRequest,
  DeliveryRequestDocument,
  PricingConfig,
  PricingConfigDocument,
} from '@libs/database';
import { DeliveryStatusEnum } from '@libs/common';
import { WithdrawEarningsDto } from './dto';

@Injectable()
export class EarningsService {
  constructor(
    @InjectModel(Rider.name) private readonly riderModel: Model<RiderDocument>,
    @InjectModel(RiderEarnings.name) private readonly earningsModel: Model<RiderEarningsDocument>,
    @InjectModel(DeliveryRequest.name) private readonly deliveryModel: Model<DeliveryRequestDocument>,
    @InjectModel(PricingConfig.name) private readonly pricingModel: Model<PricingConfigDocument>,
  ) {}

  // ═══════════════════════════════════════════════
  //  CREDIT EARNINGS ON DELIVERY COMPLETION
  //  (called by delivery service when status → DELIVERED)
  // ═══════════════════════════════════════════════

  async creditDeliveryEarnings(riderId: Types.ObjectId, deliveryRequestId: Types.ObjectId) {
    const delivery = await this.deliveryModel.findById(deliveryRequestId).lean();
    if (!delivery) return;

    // Avoid double-credit
    const existing = await this.earningsModel.findOne({
      rider: riderId,
      deliveryRequest: deliveryRequestId,
      type: EarningsTypeEnum.DELIVERY_FEE,
    });
    if (existing) return;

    // Get active pricing config for commission rate
    const config = await this.pricingModel.findOne({ isActive: true }).lean();
    const commissionRate = config?.riderCommissionPercentage ?? 0.80;
    const minPayout = config?.minimumRiderPayout ?? 100;

    const totalPrice = delivery.pricing?.totalPrice || 0;
    let riderPayout = Math.round(totalPrice * commissionRate);
    riderPayout = Math.max(riderPayout, minPayout);

    const platformCommission = totalPrice - riderPayout;

    // Create earnings record
    await this.earningsModel.create({
      _id: new Types.ObjectId(),
      rider: riderId,
      deliveryRequest: deliveryRequestId,
      type: EarningsTypeEnum.DELIVERY_FEE,
      amount: riderPayout,
      currency: 'NGN',
      status: EarningsStatusEnum.AVAILABLE,
      description: `Delivery #${delivery.trackingNumber} (${commissionRate * 100}% of ₦${totalPrice.toLocaleString()})`,
      availableAt: new Date(),
    });

    // Update rider's totalEarnings and walletBalance
    await this.riderModel.updateOne(
      { _id: riderId },
      { $inc: { totalEarnings: riderPayout, walletBalance: riderPayout } },
    );

    return { riderPayout, platformCommission, totalPrice };
  }

  // ═══════════════════════════════════════════════
  //  EARNINGS OVERVIEW
  // ═══════════════════════════════════════════════

  async getEarningsOverview(rider: Rider) {
    const riderId = new Types.ObjectId(rider._id as any);

    const [available, pending, withdrawn] = await Promise.all([
      this.earningsModel.aggregate([
        { $match: { rider: riderId, status: EarningsStatusEnum.AVAILABLE } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.earningsModel.aggregate([
        { $match: { rider: riderId, status: EarningsStatusEnum.PENDING } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.earningsModel.aggregate([
        { $match: { rider: riderId, status: EarningsStatusEnum.WITHDRAWN } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    // Also get fresh walletBalance from DB
    const freshRider = await this.riderModel.findById(rider._id).select('walletBalance totalEarnings').lean();

    return {
      success: true,
      message: 'Earnings overview retrieved',
      data: {
        totalEarnings: freshRider?.totalEarnings || rider.totalEarnings || 0,
        availableBalance: freshRider?.walletBalance ?? (available[0]?.total || 0),
        pendingBalance: pending[0]?.total || 0,
        totalWithdrawn: withdrawn[0]?.total || 0,
        walletBalance: freshRider?.walletBalance ?? 0,
        currency: 'NGN',
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  AVAILABLE BALANCE
  // ═══════════════════════════════════════════════

  async getAvailableBalance(rider: Rider) {
    const riderId = new Types.ObjectId(rider._id as any);

    const result = await this.earningsModel.aggregate([
      { $match: { rider: riderId, status: EarningsStatusEnum.AVAILABLE } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return {
      success: true,
      message: 'Available balance retrieved',
      data: {
        availableBalance: result[0]?.total || 0,
        currency: 'NGN',
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  EARNINGS HISTORY
  // ═══════════════════════════════════════════════

  async getEarningsHistory(
    rider: Rider,
    filters: { startDate?: string; endDate?: string; type?: string; status?: string; page?: number; limit?: number },
  ) {
    const riderId = new Types.ObjectId(rider._id as any);
    const { page = 1, limit = 20 } = filters;

    const query: any = { rider: riderId };
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.earningsModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('deliveryRequest', 'trackingNumber pickupLocation dropoffLocation')
        .lean(),
      this.earningsModel.countDocuments(query),
    ]);

    return {
      success: true,
      message: 'Earnings history retrieved',
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ═══════════════════════════════════════════════
  //  WITHDRAW EARNINGS
  // ═══════════════════════════════════════════════

  async withdrawEarnings(rider: Rider, body: WithdrawEarningsDto) {
    if (!rider.bankAccountNumber || !rider.bankName) {
      throw new BadRequestException('Please set up your withdrawal account first');
    }

    const riderId = new Types.ObjectId(rider._id as any);

    // Get available balance
    const balResult = await this.earningsModel.aggregate([
      { $match: { rider: riderId, status: EarningsStatusEnum.AVAILABLE } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const availableBalance = balResult[0]?.total || 0;

    if (body.amount > availableBalance) {
      throw new BadRequestException(`Insufficient balance. Available: ₦${availableBalance.toLocaleString()}`);
    }
    if (body.amount < 500) {
      throw new BadRequestException('Minimum withdrawal amount is ₦500');
    }

    // Mark available earnings as withdrawn (oldest first, up to amount)
    let remaining = body.amount;
    const availableEarnings = await this.earningsModel
      .find({ rider: riderId, status: EarningsStatusEnum.AVAILABLE })
      .sort({ createdAt: 1 })
      .lean();

    const withdrawalRef = `WD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    for (const earning of availableEarnings) {
      if (remaining <= 0) break;

      if (earning.amount <= remaining) {
        await this.earningsModel.updateOne(
          { _id: earning._id },
          { $set: { status: EarningsStatusEnum.WITHDRAWN, withdrawnAt: new Date(), withdrawalReference: withdrawalRef } },
        );
        remaining -= earning.amount;
      } else {
        // Split: withdraw part, leave remainder as available
        await this.earningsModel.updateOne(
          { _id: earning._id },
          { $set: { amount: earning.amount - remaining } },
        );
        await this.earningsModel.create({
          _id: new Types.ObjectId(),
          rider: riderId,
          deliveryRequest: earning.deliveryRequest,
          type: earning.type,
          amount: remaining,
          currency: 'NGN',
          status: EarningsStatusEnum.WITHDRAWN,
          description: `Partial withdrawal from ${earning.description || 'earnings'}`,
          withdrawnAt: new Date(),
          withdrawalReference: withdrawalRef,
        });
        remaining = 0;
      }
    }

    // Deduct from rider's walletBalance
    await this.riderModel.updateOne(
      { _id: riderId },
      { $inc: { walletBalance: -body.amount } },
    );

    return {
      success: true,
      message: 'Withdrawal initiated successfully',
      data: {
        amount: body.amount,
        reference: withdrawalRef,
        bankName: rider.bankName,
        accountNumber: rider.bankAccountNumber,
        accountName: rider.bankAccountName,
        status: 'processing',
      },
    };
  }

  // ═══════════════════════════════════════════════
  //  WITHDRAWAL HISTORY
  // ═══════════════════════════════════════════════

  async getWithdrawalHistory(rider: Rider, filters: { page?: number; limit?: number }) {
    const riderId = new Types.ObjectId(rider._id as any);
    const { page = 1, limit = 20 } = filters;

    // Group by withdrawal reference to get withdrawal summaries
    const withdrawals = await this.earningsModel.aggregate([
      { $match: { rider: riderId, status: EarningsStatusEnum.WITHDRAWN, withdrawalReference: { $exists: true } } },
      {
        $group: {
          _id: '$withdrawalReference',
          amount: { $sum: '$amount' },
          withdrawnAt: { $first: '$withdrawnAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { withdrawnAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    return {
      success: true,
      message: 'Withdrawal history retrieved',
      data: withdrawals,
    };
  }

  // ═══════════════════════════════════════════════
  //  PERIOD-BASED EARNINGS
  // ═══════════════════════════════════════════════

  async getEarningsByPeriod(rider: Rider, filters: { period: string; startDate?: string; endDate?: string }) {
    const riderId = new Types.ObjectId(rider._id as any);

    let groupBy: any;
    if (filters.period === 'daily') {
      groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    } else if (filters.period === 'weekly') {
      groupBy = { $dateToString: { format: '%Y-W%V', date: '$createdAt' } };
    } else {
      groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    }

    const match: any = { rider: riderId, type: EarningsTypeEnum.DELIVERY_FEE };
    if (filters.startDate) match.createdAt = { ...match.createdAt, $gte: new Date(filters.startDate) };
    if (filters.endDate) match.createdAt = { ...match.createdAt, $lte: new Date(filters.endDate) };

    const data = await this.earningsModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: groupBy,
          totalEarnings: { $sum: '$amount' },
          deliveries: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]);

    return { success: true, message: 'Earnings by period retrieved', data };
  }

  // ═══════════════════════════════════════════════
  //  TODAY / THIS WEEK / THIS MONTH
  // ═══════════════════════════════════════════════

  async getTodayEarnings(rider: Rider) {
    return this._getEarningsForRange(rider, 'today');
  }

  async getThisWeekEarnings(rider: Rider) {
    return this._getEarningsForRange(rider, 'week');
  }

  async getThisMonthEarnings(rider: Rider) {
    return this._getEarningsForRange(rider, 'month');
  }

  private async _getEarningsForRange(rider: Rider, range: 'today' | 'week' | 'month') {
    const riderId = new Types.ObjectId(rider._id as any);
    const now = new Date();
    let start: Date;

    if (range === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === 'week') {
      const day = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1));
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [result, deliveryCount] = await Promise.all([
      this.earningsModel.aggregate([
        { $match: { rider: riderId, createdAt: { $gte: start } } },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      this.deliveryModel.countDocuments({
        rider: riderId,
        status: { $in: [DeliveryStatusEnum.DELIVERED, DeliveryStatusEnum.COMPLETED] },
        deliveredAt: { $gte: start },
      }),
    ]);

    const byType: Record<string, number> = {};
    let totalEarnings = 0;
    for (const r of result) {
      byType[r._id] = r.total;
      totalEarnings += r.total;
    }

    const label = range === 'today' ? "Today's" : range === 'week' ? "This week's" : "This month's";

    return {
      success: true,
      message: `${label} earnings retrieved`,
      data: {
        totalEarnings,
        deliveriesCompleted: deliveryCount,
        deliveryFees: byType[EarningsTypeEnum.DELIVERY_FEE] || 0,
        tips: byType[EarningsTypeEnum.TIP] || 0,
        bonuses: byType[EarningsTypeEnum.BONUS] || 0,
        currency: 'NGN',
      },
    };
  }
}
