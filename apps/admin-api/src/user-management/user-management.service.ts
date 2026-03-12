import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@libs/database';
import { UserFilterDto } from './dto';

@Injectable()
export class UserManagementService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async getAllUsers(filters: UserFilterDto) {
    const { search, isActive, startDate, endDate, page = 1, limit = 20 } = filters;
    const query: any = {};

    if (isActive !== undefined) query.isActive = isActive;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.userModel
        .find(query)
        .select(
          'firstName lastName userName email phone gender profilePhotoUrl ' +
          'isActive isEmailConfirmed isPhoneConfirmed isOnboardingComplete ' +
          'lastLoginDate createdAt updatedAt',
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(query),
    ]);

    return {
      success: true,
      message: 'Users retrieved',
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserById(id: string) {
    const user = await this.userModel
      .findById(id)
      .select(
        'firstName lastName userName email phone gender dob profilePhotoUrl ' +
        'isActive isEmailConfirmed isPhoneConfirmed isOnboardingComplete isSocialLogin ' +
        'emailNotification mobileNotification deliveryNotification paymentNotification ' +
        'latitude longitude lastLoginDate createdAt updatedAt',
      )
      .lean();

    if (!user) throw new NotFoundException('User not found');

    return { success: true, message: 'User retrieved', data: user };
  }

  async getUserStats() {
    const [total, active, inactive, emailConfirmed, recentSignups] =
      await Promise.all([
        this.userModel.countDocuments(),
        this.userModel.countDocuments({ isActive: true }),
        this.userModel.countDocuments({ isActive: false }),
        this.userModel.countDocuments({ isEmailConfirmed: true }),
        this.userModel.countDocuments({
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        }),
      ]);

    return {
      success: true,
      message: 'User stats retrieved',
      data: { total, active, inactive, emailConfirmed, recentSignups },
    };
  }

  async suspendUser(id: string, reason?: string) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    await this.userModel.updateOne(
      { _id: id },
      { $set: { isActive: false } },
    );

    return { success: true, message: 'User suspended successfully' };
  }

  async unsuspendUser(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    await this.userModel.updateOne(
      { _id: id },
      { $set: { isActive: true } },
    );

    return { success: true, message: 'User reactivated successfully' };
  }
}
