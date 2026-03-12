import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Rider,
  RiderDocument,
  User,
  UserDocument,
  DeliveryRequest,
  DeliveryRequestDocument,
  PlatformEarning,
  PlatformEarningDocument,
  PlatformEarningStatusEnum,
  WithdrawalRequest,
  WithdrawalRequestDocument,
  WithdrawalStatusEnum,
  AuditLog,
  AuditLogDocument,
} from '@libs/database';
import { DeliveryStatusEnum } from '@libs/common';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Rider.name) private readonly riderModel: Model<RiderDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(DeliveryRequest.name) private readonly deliveryModel: Model<DeliveryRequestDocument>,
    @InjectModel(PlatformEarning.name) private readonly platformEarningModel: Model<PlatformEarningDocument>,
    @InjectModel(WithdrawalRequest.name) private readonly withdrawalModel: Model<WithdrawalRequestDocument>,
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async getDashboard() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeStatuses = [
      DeliveryStatusEnum.PENDING, DeliveryStatusEnum.SEARCHING_RIDER,
      DeliveryStatusEnum.RIDER_ACCEPTED, DeliveryStatusEnum.RIDER_ASSIGNED,
      DeliveryStatusEnum.RIDER_EN_ROUTE_PICKUP, DeliveryStatusEnum.RIDER_ARRIVED_PICKUP,
      DeliveryStatusEnum.AWAITING_PAYMENT, DeliveryStatusEnum.PAYMENT_CONFIRMED,
      DeliveryStatusEnum.PICKUP_IN_PROGRESS, DeliveryStatusEnum.PICKED_UP,
      DeliveryStatusEnum.IN_TRANSIT, DeliveryStatusEnum.RIDER_ARRIVED_DROPOFF,
      DeliveryStatusEnum.DELIVERY_IN_PROGRESS, DeliveryStatusEnum.SCHEDULED,
    ];

    const [
      stats,
      trends,
      revenueChart,
      deliveryChart,
      recentDeliveries,
      recentActivity,
    ] = await Promise.all([
      this._getStats(todayStart, activeStatuses),
      this._getTrends(thirtyDaysAgo, sixtyDaysAgo),
      this._getRevenueChart(thirtyDaysAgo),
      this._getDeliveryChart(sevenDaysAgo),
      this._getRecentDeliveries(),
      this._getRecentActivity(),
    ]);

    return { success: true, data: { stats, trends, revenueChart, deliveryChart, recentDeliveries, recentActivity } };
  }

  private async _getStats(todayStart: Date, activeStatuses: string[]) {
    const [
      totalRiders,
      onlineRiders,
      totalUsers,
      activeDeliveries,
      todayRevenueResult,
      todayDeliveriesCompleted,
      pendingWithdrawals,
      totalDeliveries,
    ] = await Promise.all([
      this.riderModel.countDocuments(),
      this.riderModel.countDocuments({ isOnline: true }),
      this.userModel.countDocuments(),
      this.deliveryModel.countDocuments({ status: { $in: activeStatuses } }),
      this.platformEarningModel.aggregate([
        { $match: { status: PlatformEarningStatusEnum.EARNED, createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$totalDeliveryPrice' }, commission: { $sum: '$platformCommission' } } },
      ]),
      this.deliveryModel.countDocuments({
        status: { $in: [DeliveryStatusEnum.DELIVERED, DeliveryStatusEnum.COMPLETED] },
        deliveredAt: { $gte: todayStart },
      }),
      this.withdrawalModel.countDocuments({ status: WithdrawalStatusEnum.PENDING }),
      this.deliveryModel.countDocuments(),
    ]);

    return {
      totalRiders,
      onlineRiders,
      totalUsers,
      activeDeliveries,
      totalDeliveries,
      todayRevenue: todayRevenueResult[0]?.total || 0,
      todayCommission: todayRevenueResult[0]?.commission || 0,
      todayDeliveriesCompleted,
      pendingWithdrawals,
    };
  }

  private async _getTrends(thirtyDaysAgo: Date, sixtyDaysAgo: Date) {
    const [
      ridersCurrentPeriod,
      ridersPreviousPeriod,
      usersCurrentPeriod,
      usersPreviousPeriod,
      deliveriesCurrent,
      deliveriesPrevious,
      revenueCurrent,
      revenuePrevious,
    ] = await Promise.all([
      this.riderModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      this.riderModel.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      this.userModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      this.userModel.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      this.deliveryModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      this.deliveryModel.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      this.platformEarningModel.aggregate([
        { $match: { status: PlatformEarningStatusEnum.EARNED, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$totalDeliveryPrice' } } },
      ]),
      this.platformEarningModel.aggregate([
        { $match: { status: PlatformEarningStatusEnum.EARNED, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$totalDeliveryPrice' } } },
      ]),
    ]);

    const calcChange = (current: number, previous: number) =>
      previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100 * 10) / 10;

    const revCurr = revenueCurrent[0]?.total || 0;
    const revPrev = revenuePrevious[0]?.total || 0;

    return {
      riders: { current: ridersCurrentPeriod, previous: ridersPreviousPeriod, change: calcChange(ridersCurrentPeriod, ridersPreviousPeriod) },
      users: { current: usersCurrentPeriod, previous: usersPreviousPeriod, change: calcChange(usersCurrentPeriod, usersPreviousPeriod) },
      deliveries: { current: deliveriesCurrent, previous: deliveriesPrevious, change: calcChange(deliveriesCurrent, deliveriesPrevious) },
      revenue: { current: revCurr, previous: revPrev, change: calcChange(revCurr, revPrev) },
    };
  }

  private async _getRevenueChart(since: Date) {
    const data = await this.platformEarningModel.aggregate([
      { $match: { status: PlatformEarningStatusEnum.EARNED, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalDeliveryPrice' },
          commission: { $sum: '$platformCommission' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return data.map((d: any) => ({ date: d._id, revenue: d.revenue, commission: d.commission, deliveries: d.count }));
  }

  private async _getDeliveryChart(since: Date) {
    const data = await this.deliveryModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $in: ['$status', [DeliveryStatusEnum.DELIVERED, DeliveryStatusEnum.COMPLETED]] }, 1, 0],
            },
          },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', DeliveryStatusEnum.CANCELLED] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return data.map((d: any) => ({ date: d._id, total: d.total, completed: d.completed, cancelled: d.cancelled }));
  }

  private async _getRecentDeliveries() {
    const deliveries = await this.deliveryModel
      .find()
      .populate('rider', 'firstName lastName')
      .populate('customer', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    return deliveries.map((d: any) => ({
      id: d._id,
      trackingNumber: d.trackingNumber,
      rider: d.rider ? `${d.rider.firstName || ''} ${d.rider.lastName || ''}`.trim() : '—',
      customer: d.customer ? `${d.customer.firstName || ''} ${d.customer.lastName || ''}`.trim() : '—',
      pickup: d.pickupLocation?.address || '—',
      dropoff: d.dropoffLocation?.address || '—',
      status: d.status,
      fare: d.pricing?.totalPrice || 0,
      deliveryType: d.deliveryType,
      createdAt: d.createdAt,
    }));
  }

  private async _getRecentActivity() {
    const logs = await this.auditLogModel
      .find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return logs.map((l: any) => ({
      id: l._id,
      action: l.action,
      category: l.category,
      performedBy: l.performedBy,
      targetType: l.targetType,
      createdAt: l.createdAt,
    }));
  }
}
