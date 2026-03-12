import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WithdrawalRequest,
  WithdrawalRequestDocument,
  WithdrawalStatusEnum,
  RiderEarnings,
  RiderEarningsDocument,
  EarningsStatusEnum,
  Rider,
  RiderDocument,
} from '@libs/database';

@Injectable()
export class WithdrawalsService {
  constructor(
    @InjectModel(WithdrawalRequest.name) private readonly withdrawalModel: Model<WithdrawalRequestDocument>,
    @InjectModel(RiderEarnings.name) private readonly earningsModel: Model<RiderEarningsDocument>,
    @InjectModel(Rider.name) private readonly riderModel: Model<RiderDocument>,
  ) {}

  async getWithdrawals(filters: { status?: string; page?: number; limit?: number; search?: string }) {
    const { status, page = 1, limit = 20, search } = filters;
    const query: any = {};
    if (status) query.status = status;

    const [data, total] = await Promise.all([
      this.withdrawalModel
        .find(query)
        .populate('rider', 'firstName lastName phone email walletBalance')
        .populate('processedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.withdrawalModel.countDocuments(query),
    ]);

    return {
      success: true,
      message: 'Withdrawal requests retrieved',
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getWithdrawalStats() {
    const [pending, approved, rejected] = await Promise.all([
      this.withdrawalModel.aggregate([
        { $match: { status: WithdrawalStatusEnum.PENDING } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      this.withdrawalModel.aggregate([
        { $match: { status: WithdrawalStatusEnum.APPROVED } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      this.withdrawalModel.aggregate([
        { $match: { status: WithdrawalStatusEnum.REJECTED } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    return {
      success: true,
      data: {
        pending: { amount: pending[0]?.total || 0, count: pending[0]?.count || 0 },
        approved: { amount: approved[0]?.total || 0, count: approved[0]?.count || 0 },
        rejected: { amount: rejected[0]?.total || 0, count: rejected[0]?.count || 0 },
      },
    };
  }

  async approveWithdrawal(id: string, adminId: string, note?: string) {
    const withdrawal = await this.withdrawalModel.findById(id);
    if (!withdrawal) throw new NotFoundException('Withdrawal request not found');
    if (withdrawal.status !== WithdrawalStatusEnum.PENDING) {
      throw new BadRequestException(`Cannot approve a ${withdrawal.status} withdrawal`);
    }

    // Mark held earnings as withdrawn
    await this.earningsModel.updateMany(
      { withdrawalReference: withdrawal.reference, status: EarningsStatusEnum.HELD },
      { $set: { status: EarningsStatusEnum.WITHDRAWN, withdrawnAt: new Date() } },
    );

    // Update the withdrawal request
    withdrawal.status = WithdrawalStatusEnum.APPROVED;
    withdrawal.processedBy = new Types.ObjectId(adminId);
    withdrawal.processedAt = new Date();
    if (note) withdrawal.adminNote = note;
    await withdrawal.save();

    return { success: true, message: 'Withdrawal approved successfully', data: withdrawal };
  }

  async rejectWithdrawal(id: string, adminId: string, note?: string) {
    const withdrawal = await this.withdrawalModel.findById(id);
    if (!withdrawal) throw new NotFoundException('Withdrawal request not found');
    if (withdrawal.status !== WithdrawalStatusEnum.PENDING) {
      throw new BadRequestException(`Cannot reject a ${withdrawal.status} withdrawal`);
    }

    // Release held earnings back to available
    await this.earningsModel.updateMany(
      { withdrawalReference: withdrawal.reference, status: EarningsStatusEnum.HELD },
      { $set: { status: EarningsStatusEnum.AVAILABLE }, $unset: { withdrawalReference: 1 } },
    );

    // Restore rider's wallet balance
    await this.riderModel.updateOne(
      { _id: withdrawal.rider },
      { $inc: { walletBalance: withdrawal.amount } },
    );

    // Update the withdrawal request
    withdrawal.status = WithdrawalStatusEnum.REJECTED;
    withdrawal.processedBy = new Types.ObjectId(adminId);
    withdrawal.processedAt = new Date();
    if (note) withdrawal.adminNote = note;
    await withdrawal.save();

    return { success: true, message: 'Withdrawal rejected. Funds released back to rider.', data: withdrawal };
  }
}
