import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import {
  AuditLog,
  AuditLogDocument,
  AuditCategoryEnum,
  AuditStatusEnum,
} from '@libs/database';

export interface CreateAuditLogDto {
  admin?: Types.ObjectId | string;
  adminName?: string;
  adminRole?: string;
  action: string;
  category: AuditCategoryEnum;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  status?: AuditStatusEnum;
  ipAddress?: string;
  userAgent?: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLogDocument> {
    try {
      let adminId: Types.ObjectId | undefined;
      if (dto.admin) {
        try {
          adminId = new Types.ObjectId(dto.admin.toString());
        } catch {
          adminId = undefined;
        }
      }

      const doc = await this.auditLogModel.create({
        _id: new Types.ObjectId(),
        action: dto.action,
        category: dto.category,
        status: dto.status || AuditStatusEnum.SUCCESS,
        admin: adminId,
        adminName: dto.adminName,
        adminRole: dto.adminRole,
        targetType: dto.targetType,
        targetId: dto.targetId,
        targetLabel: dto.targetLabel,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        previousValue: dto.previousValue,
        newValue: dto.newValue,
        metadata: dto.metadata,
      });
      return doc;
    } catch (err) {
      this.logger.error(
        `Failed to write audit log: ${err?.message || err}`,
        err?.stack,
      );
      return null;
    }
  }

  async findAll(filters: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    adminId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      adminId,
      startDate,
      endDate,
    } = filters;

    const query: FilterQuery<AuditLogDocument> = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (adminId) query.admin = new Types.ObjectId(adminId);

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { adminName: { $regex: search, $options: 'i' } },
        { targetLabel: { $regex: search, $options: 'i' } },
        { targetType: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.auditLogModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalLogs,
      todayLogs,
      weekLogs,
      failureLogs,
      categoryBreakdown,
    ] = await Promise.all([
      this.auditLogModel.countDocuments(),
      this.auditLogModel.countDocuments({ createdAt: { $gte: today } }),
      this.auditLogModel.countDocuments({ createdAt: { $gte: weekAgo } }),
      this.auditLogModel.countDocuments({
        status: AuditStatusEnum.FAILURE,
        createdAt: { $gte: weekAgo },
      }),
      this.auditLogModel.aggregate([
        { $match: { createdAt: { $gte: weekAgo } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      totalLogs,
      todayLogs,
      weekLogs,
      failureLogs,
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c._id,
        count: c.count,
      })),
    };
  }
}
