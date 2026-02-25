import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Rider, RiderDocument, Admin } from '@libs/database';
import { RiderVerificationStatusEnum, RiderStatusEnum } from '@libs/common';
import { NotificationService } from '@libs/common/modules/notification';
import { NotificationRecipientType } from '@libs/database';
import {
  CreateRiderDto,
  UpdateRiderDto,
  SuspendRiderDto,
  ResetRiderPasswordDto,
  BindDeviceDto,
  VerifyRiderDto,
  RiderFilterDto,
} from './dto';

@Injectable()
export class RiderManagementService {
  constructor(
    @InjectModel(Rider.name) private readonly riderModel: Model<RiderDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  // ── Push notify rider ──
  private async pushNotifyRider(riderId: any, title: string, body: string, data?: Record<string, any>) {
    try {
      const rider = await this.riderModel.findById(riderId).select('fcmToken').lean();
      if (rider?.fcmToken) {
        await this.notificationService.send({
          recipientId: riderId instanceof Types.ObjectId ? riderId : new Types.ObjectId(riderId),
          recipientType: NotificationRecipientType.RIDER,
          title, body, token: rider.fcmToken, data,
        });
      }
    } catch (_) {}
  }

  // ════════════════════════════════════════════
  //  CREATE RIDER (admin only)
  // ════════════════════════════════════════════

  async createRider(admin: Admin, body: CreateRiderDto) {
    // Check uniqueness
    const existing = await this.riderModel.findOne({
      $or: [
        { email: body.email.toLowerCase().trim() },
        { phone: body.phone },
      ],
    });
    if (existing) {
      throw new ConflictException(
        existing.email === body.email.toLowerCase().trim()
          ? 'Email is already in use'
          : 'Phone number is already in use',
      );
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(body.password, salt);

    const rider = await this.riderModel.create({
      _id: new Types.ObjectId(),
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email.toLowerCase().trim(),
      phone: body.phone,
      passwordHash: hash,
      passwordSalt: salt,
      gender: body.gender,
      vehicleType: body.vehicleType,
      vehiclePlateNumber: body.vehiclePlateNumber,
      vehicleModel: body.vehicleModel,
      vehicleColor: body.vehicleColor,
      enforceDeviceBinding: body.enforceDeviceBinding ?? true,
      maxConcurrentDeliveries: body.maxConcurrentDeliveries ?? 1,
      assignedZones: body.assignedZones?.map((z) => new Types.ObjectId(z)) || [],
      verificationStatus: RiderVerificationStatusEnum.PENDING,
      status: RiderStatusEnum.OFFLINE,
      isActive: true,
      isOnline: false,
    });

    return {
      success: true,
      message: 'Rider account created successfully',
      data: {
        id: rider._id,
        firstName: rider.firstName,
        lastName: rider.lastName,
        email: rider.email,
        phone: rider.phone,
        vehicleType: rider.vehicleType,
        vehiclePlateNumber: rider.vehiclePlateNumber,
        verificationStatus: rider.verificationStatus,
        enforceDeviceBinding: rider.enforceDeviceBinding,
      },
    };
  }

  // ════════════════════════════════════════════
  //  LIST RIDERS
  // ════════════════════════════════════════════

  async getAllRiders(filters: RiderFilterDto) {
    const { status, verificationStatus, search, isOnline, page = 1, limit = 20 } = filters;
    const query: any = {};

    if (status) query.status = status;
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (isOnline !== undefined) query.isOnline = isOnline;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { vehiclePlateNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.riderModel
        .find(query)
        .select('-passwordHash -passwordSalt -resetPasswordOtp -resetPasswordOtpExpiry -boundDeviceId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.riderModel.countDocuments(query),
    ]);

    return {
      success: true,
      message: 'Riders retrieved',
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ════════════════════════════════════════════
  //  GET RIDER BY ID
  // ════════════════════════════════════════════

  async getRiderById(id: string) {
    const rider = await this.riderModel
      .findById(id)
      .select('-passwordHash -passwordSalt -resetPasswordOtp -resetPasswordOtpExpiry')
      .select('+boundDeviceId')
      .lean();

    if (!rider) throw new NotFoundException('Rider not found');

    return { success: true, message: 'Rider retrieved', data: rider };
  }

  // ════════════════════════════════════════════
  //  UPDATE RIDER
  // ════════════════════════════════════════════

  async updateRider(id: string, body: UpdateRiderDto) {
    const rider = await this.riderModel.findById(id);
    if (!rider) throw new NotFoundException('Rider not found');

    // Check unique constraints if email/phone changing
    if (body.email && body.email !== rider.email) {
      const dup = await this.riderModel.findOne({ email: body.email.toLowerCase().trim(), _id: { $ne: id } });
      if (dup) throw new ConflictException('Email is already in use');
      body.email = body.email.toLowerCase().trim();
    }
    if (body.phone && body.phone !== rider.phone) {
      const dup = await this.riderModel.findOne({ phone: body.phone, _id: { $ne: id } });
      if (dup) throw new ConflictException('Phone number is already in use');
    }

    const updateData: any = { ...body };
    if (body.assignedZones) {
      updateData.assignedZones = body.assignedZones.map((z) => new Types.ObjectId(z));
    }

    await this.riderModel.updateOne({ _id: id }, { $set: updateData });

    return { success: true, message: 'Rider updated successfully' };
  }

  // ════════════════════════════════════════════
  //  VERIFY RIDER
  // ════════════════════════════════════════════

  async verifyRider(id: string, body: VerifyRiderDto) {
    const rider = await this.riderModel.findById(id);
    if (!rider) throw new NotFoundException('Rider not found');

    await this.riderModel.updateOne(
      { _id: id },
      { $set: { verificationStatus: body.status } },
    );

    // Notify rider
    const title = body.status === 'verified' ? 'Account Verified ✅' : 'Verification Update';
    const msg = body.status === 'verified'
      ? 'Your account has been verified. You can now go online and receive deliveries.'
      : `Your verification was not approved. Reason: ${body.reason || 'Contact admin for details.'}`;

    await this.pushNotifyRider(id, title, msg, { type: 'verification_update', status: body.status });

    return {
      success: true,
      message: `Rider ${body.status === 'verified' ? 'verified' : 'rejected'} successfully`,
    };
  }

  // ════════════════════════════════════════════
  //  SUSPEND / UNSUSPEND
  // ════════════════════════════════════════════

  async suspendRider(admin: Admin, id: string, body: SuspendRiderDto) {
    const rider = await this.riderModel.findById(id);
    if (!rider) throw new NotFoundException('Rider not found');

    await this.riderModel.updateOne(
      { _id: id },
      {
        $set: {
          isSuspended: true,
          suspensionReason: body.reason,
          suspendedAt: new Date(),
          suspendedBy: admin._id as any,
          isOnline: false,
          status: RiderStatusEnum.OFFLINE,
        },
      },
    );

    await this.pushNotifyRider(id, 'Account Suspended',
      `Your account has been suspended. Reason: ${body.reason}`,
      { type: 'account_suspended' },
    );

    return { success: true, message: 'Rider suspended' };
  }

  async unsuspendRider(id: string) {
    const rider = await this.riderModel.findById(id);
    if (!rider) throw new NotFoundException('Rider not found');

    await this.riderModel.updateOne(
      { _id: id },
      {
        $set: {
          isSuspended: false,
          suspensionReason: null,
          suspendedAt: null,
          suspendedBy: null,
        },
      },
    );

    await this.pushNotifyRider(id, 'Account Reinstated ✅',
      'Your suspension has been lifted. You can now log in and receive deliveries.',
      { type: 'account_reinstated' },
    );

    return { success: true, message: 'Rider unsuspended' };
  }

  // ════════════════════════════════════════════
  //  RESET PASSWORD
  // ════════════════════════════════════════════

  async resetRiderPassword(id: string, body: ResetRiderPasswordDto) {
    const rider = await this.riderModel.findById(id);
    if (!rider) throw new NotFoundException('Rider not found');

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(body.newPassword, salt);

    await this.riderModel.updateOne(
      { _id: id },
      { $set: { passwordHash: hash, passwordSalt: salt } },
    );

    return { success: true, message: 'Rider password reset successfully' };
  }

  // ════════════════════════════════════════════
  //  DEVICE BINDING
  // ════════════════════════════════════════════

  async updateDeviceBinding(id: string, body: BindDeviceDto) {
    const rider = await this.riderModel.findById(id);
    if (!rider) throw new NotFoundException('Rider not found');

    if (body.deviceId) {
      // Bind to new device
      await this.riderModel.updateOne(
        { _id: id },
        {
          $set: {
            boundDeviceId: body.deviceId,
            boundDeviceModel: body.deviceModel || null,
            deviceBoundAt: new Date(),
          },
        },
      );
      return { success: true, message: 'Device bound successfully' };
    } else {
      // Unbind device
      await this.riderModel.updateOne(
        { _id: id },
        {
          $set: {
            boundDeviceId: null,
            boundDeviceModel: null,
            deviceBoundAt: null,
          },
        },
      );
      return { success: true, message: 'Device unbound. Rider can log in from any device next time.' };
    }
  }

  // ════════════════════════════════════════════
  //  STATS
  // ════════════════════════════════════════════

  async getRiderStats() {
    const [total, verified, online, suspended, pending] = await Promise.all([
      this.riderModel.countDocuments(),
      this.riderModel.countDocuments({ verificationStatus: 'verified' }),
      this.riderModel.countDocuments({ isOnline: true }),
      this.riderModel.countDocuments({ isSuspended: true }),
      this.riderModel.countDocuments({ verificationStatus: 'pending' }),
    ]);

    return {
      success: true,
      message: 'Rider stats retrieved',
      data: { total, verified, online, suspended, pendingVerification: pending },
    };
  }
}
