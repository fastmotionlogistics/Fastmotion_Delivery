import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PlatformEarning,
  PlatformEarningDocument,
  PlatformEarningStatusEnum,
  RiderEarnings,
  RiderEarningsDocument,
  EarningsStatusEnum,
  Payment,
  PaymentDocument,
  DeliveryRequest,
  DeliveryRequestDocument,
} from '@libs/database';
import { EarningsFilterDto } from './dto';

@Injectable()
export class AdminEarningsService {
  constructor(
    @InjectModel(PlatformEarning.name) private readonly platformEarningModel: Model<PlatformEarningDocument>,
    @InjectModel(RiderEarnings.name) private readonly riderEarningsModel: Model<RiderEarningsDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(DeliveryRequest.name) private readonly deliveryModel: Model<DeliveryRequestDocument>,
  ) {}

  async getEarningsStats(startDate?: string, endDate?: string) {
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [
      totalEarningsResult,
      platformCommissionResult,
      totalPayoutsResult,
      pendingPayoutsResult,
      totalRefundsResult,
    ] = await Promise.all([
      // Total delivery earnings (all completed payments)
      this.platformEarningModel.aggregate([
        { $match: { status: PlatformEarningStatusEnum.EARNED, ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$totalDeliveryPrice' }, count: { $sum: 1 } } },
      ]),
      // Platform commission
      this.platformEarningModel.aggregate([
        { $match: { status: PlatformEarningStatusEnum.EARNED, ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$platformCommission' } } },
      ]),
      // Total rider payouts (withdrawn)
      this.riderEarningsModel.aggregate([
        { $match: { status: EarningsStatusEnum.WITHDRAWN, ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Pending payouts (available but not yet withdrawn)
      this.riderEarningsModel.aggregate([
        { $match: { status: EarningsStatusEnum.AVAILABLE } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Total refunds
      this.paymentModel.aggregate([
        { $match: { isRefund: true, ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      success: true,
      message: 'Earnings stats retrieved',
      data: {
        totalEarnings: totalEarningsResult[0]?.total || 0,
        deliveryCount: totalEarningsResult[0]?.count || 0,
        platformCommission: platformCommissionResult[0]?.total || 0,
        totalPayouts: totalPayoutsResult[0]?.total || 0,
        pendingPayouts: pendingPayoutsResult[0]?.total || 0,
        totalRefunds: totalRefundsResult[0]?.total || 0,
        currency: 'NGN',
      },
    };
  }

  async getTransactions(filters: EarningsFilterDto) {
    const { tab = 'all', search, startDate, endDate, page = 1, limit = 20 } = filters;

    if (tab === 'ride_fares') {
      return this._getRideFareTransactions({ search, startDate, endDate, page, limit });
    }
    if (tab === 'payouts') {
      return this._getPayoutTransactions({ search, startDate, endDate, page, limit });
    }
    if (tab === 'refunds') {
      return this._getRefundTransactions({ search, startDate, endDate, page, limit });
    }

    // "all" tab — platform earnings (commission records)
    return this._getAllTransactions({ search, startDate, endDate, page, limit });
  }

  private async _getAllTransactions(f: any) {
    const query: any = {};
    if (f.startDate || f.endDate) {
      query.createdAt = {};
      if (f.startDate) query.createdAt.$gte = new Date(f.startDate);
      if (f.endDate) query.createdAt.$lte = new Date(f.endDate);
    }
    if (f.search) {
      query.trackingNumber = { $regex: f.search, $options: 'i' };
    }

    const [data, total] = await Promise.all([
      this.platformEarningModel
        .find(query)
        .populate('rider', 'firstName lastName')
        .populate('customer', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((f.page - 1) * f.limit)
        .limit(f.limit)
        .lean(),
      this.platformEarningModel.countDocuments(query),
    ]);

    return {
      success: true,
      data: data.map((d: any) => ({
        id: d._id,
        type: 'Delivery Commission',
        party: d.rider ? `${d.rider.firstName || ''} ${d.rider.lastName || ''}`.trim() : '—',
        customer: d.customer ? `${d.customer.firstName || ''} ${d.customer.lastName || ''}`.trim() : '—',
        amount: d.totalDeliveryPrice,
        commission: d.platformCommission,
        riderPayout: d.riderPayout,
        status: d.status,
        trackingNumber: d.trackingNumber,
        date: d.createdAt,
      })),
      pagination: { total, page: f.page, limit: f.limit, totalPages: Math.ceil(total / f.limit) },
    };
  }

  private async _getRideFareTransactions(f: any) {
    const query: any = { status: 'paid' };
    if (f.startDate || f.endDate) {
      query.createdAt = {};
      if (f.startDate) query.createdAt.$gte = new Date(f.startDate);
      if (f.endDate) query.createdAt.$lte = new Date(f.endDate);
    }
    if (f.search) {
      query.reference = { $regex: f.search, $options: 'i' };
    }

    const [data, total] = await Promise.all([
      this.paymentModel
        .find({ ...query, isRefund: false })
        .populate('user', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((f.page - 1) * f.limit)
        .limit(f.limit)
        .lean(),
      this.paymentModel.countDocuments({ ...query, isRefund: false }),
    ]);

    return {
      success: true,
      data: data.map((p: any) => ({
        id: p._id,
        type: 'Ride Fare',
        party: p.user ? `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() : '—',
        amount: p.amount,
        status: p.status,
        reference: p.reference,
        paymentMethod: p.paymentMethod,
        date: p.paidAt || p.createdAt,
      })),
      pagination: { total, page: f.page, limit: f.limit, totalPages: Math.ceil(total / f.limit) },
    };
  }

  private async _getPayoutTransactions(f: any) {
    const query: any = { status: EarningsStatusEnum.WITHDRAWN };
    if (f.startDate || f.endDate) {
      query.withdrawnAt = {};
      if (f.startDate) query.withdrawnAt.$gte = new Date(f.startDate);
      if (f.endDate) query.withdrawnAt.$lte = new Date(f.endDate);
    }

    // Group by withdrawal reference
    const matchStage: any = { ...query };
    if (f.search) {
      matchStage.withdrawalReference = { $regex: f.search, $options: 'i' };
    }

    const pipeline: any[] = [
      { $match: { ...matchStage, withdrawalReference: { $exists: true, $ne: null } } },
      { $group: {
        _id: '$withdrawalReference',
        rider: { $first: '$rider' },
        amount: { $sum: '$amount' },
        withdrawnAt: { $first: '$withdrawnAt' },
        count: { $sum: 1 },
      }},
      { $sort: { withdrawnAt: -1 } },
      { $skip: (f.page - 1) * f.limit },
      { $limit: f.limit },
      { $lookup: { from: 'riders', localField: 'rider', foreignField: '_id', as: 'riderDoc' } },
      { $unwind: { path: '$riderDoc', preserveNullAndEmptyArrays: true } },
    ];

    const data = await this.riderEarningsModel.aggregate(pipeline);

    const totalPipeline = [
      { $match: { ...matchStage, withdrawalReference: { $exists: true, $ne: null } } },
      { $group: { _id: '$withdrawalReference' } },
      { $count: 'total' },
    ];
    const countResult = await this.riderEarningsModel.aggregate(totalPipeline);
    const total = countResult[0]?.total || 0;

    return {
      success: true,
      data: data.map((d: any) => ({
        id: d._id,
        type: 'Rider Payout',
        party: d.riderDoc ? `${d.riderDoc.firstName || ''} ${d.riderDoc.lastName || ''}`.trim() : '—',
        amount: -d.amount,
        status: 'completed',
        reference: d._id,
        date: d.withdrawnAt,
      })),
      pagination: { total, page: f.page, limit: f.limit, totalPages: Math.ceil(total / f.limit) },
    };
  }

  private async _getRefundTransactions(f: any) {
    const query: any = { isRefund: true };
    if (f.startDate || f.endDate) {
      query.createdAt = {};
      if (f.startDate) query.createdAt.$gte = new Date(f.startDate);
      if (f.endDate) query.createdAt.$lte = new Date(f.endDate);
    }
    if (f.search) {
      query.reference = { $regex: f.search, $options: 'i' };
    }

    const [data, total] = await Promise.all([
      this.paymentModel
        .find(query)
        .populate('user', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((f.page - 1) * f.limit)
        .limit(f.limit)
        .lean(),
      this.paymentModel.countDocuments(query),
    ]);

    return {
      success: true,
      data: data.map((p: any) => ({
        id: p._id,
        type: 'Refund',
        party: p.user ? `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() : '—',
        amount: -p.amount,
        status: p.status,
        reason: p.refundReason,
        reference: p.reference,
        date: p.refundedAt || p.createdAt,
      })),
      pagination: { total, page: f.page, limit: f.limit, totalPages: Math.ceil(total / f.limit) },
    };
  }

  async getRevenueTrend(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await this.platformEarningModel.aggregate([
      { $match: { status: PlatformEarningStatusEnum.EARNED, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalDeliveryPrice' },
          commission: { $sum: '$platformCommission' },
          deliveries: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      success: true,
      message: 'Revenue trend retrieved',
      data,
    };
  }
}
