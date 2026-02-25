import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import {
  Admin,
  AdminDocument,
  AdminRoleEnum,
  ROLE_PERMISSIONS,
  RefreshToken,
} from '@libs/database';
import { generateRandomString } from '@libs/common';
import { AdminJwtTokenService } from './strategies/jwt.service';
import {
  LoginAdminDto,
  ChangePasswordDto,
  CreateAdminDto,
  UpdateAdminDto,
  ResetAdminPasswordDto,
  LogoutAdminDto,
} from './dto';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(Admin.name) private readonly adminModel: Model<AdminDocument>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,
    private readonly jwtTokenService: AdminJwtTokenService,
  ) {}

  // ════════════════════════════════════════════
  //  LOGIN
  // ════════════════════════════════════════════

  async login(admin: Admin, body: LoginAdminDto, ip?: string) {
    // Reset failed attempts on successful login
    const updateFields: any = {
      lastLoginDate: new Date(),
      loginFailedCount: 0,
      lockedUntil: null,
    };
    if (ip) updateFields.lastLoginIp = ip;
    await this.adminModel.updateOne({ _id: admin._id }, { $set: updateFields });

    // Generate tokens
    const accessToken = this.jwtTokenService.generateAccessToken({
      admin_id: admin._id,
      email: admin.email,
      role: admin.role,
    });

    const refreshToken = await this.generateRefreshToken(admin);

    // Merge role-default permissions + custom permissions
    const rolePerms = ROLE_PERMISSIONS[admin.role as AdminRoleEnum] || [];
    const allPermissions = [...new Set([...rolePerms, ...(admin.permissions || [])])];

    return {
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        admin: {
          id: admin._id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
          permissions: allPermissions,
          profilePhoto: admin.profilePhoto,
          mustChangePassword: admin.mustChangePassword,
        },
      },
    };
  }

  // ════════════════════════════════════════════
  //  VERIFY ADMIN (Local strategy helper)
  // ════════════════════════════════════════════

  async verifyAdmin(email: string, password: string): Promise<Admin | null> {
    const admin = await this.adminModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash +passwordSalt');

    if (!admin) return null;

    if (!admin.isActive) {
      throw new ForbiddenException('Account is deactivated. Contact a super admin.');
    }

    // Check if locked
    if (admin.lockedUntil && new Date(admin.lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(admin.lockedUntil).getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account is locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`,
      );
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);

    if (!valid) {
      // Increment failed attempts
      const failedCount = (admin.loginFailedCount || 0) + 1;
      const lockUpdate: any = { loginFailedCount: failedCount };

      if (failedCount >= MAX_LOGIN_ATTEMPTS) {
        lockUpdate.lockedUntil = new Date(
          Date.now() + LOCK_DURATION_MINUTES * 60 * 1000,
        );
        this.logger.warn(
          `Admin account ${admin.email} locked after ${failedCount} failed attempts`,
        );
      }

      await this.adminModel.updateOne({ _id: admin._id }, { $set: lockUpdate });
      return null;
    }

    return admin;
  }

  // ════════════════════════════════════════════
  //  CHANGE PASSWORD
  // ════════════════════════════════════════════

  async changePassword(admin: Admin, body: ChangePasswordDto) {
    if (body.newPassword !== body.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const fullAdmin = await this.adminModel
      .findById(admin._id)
      .select('+passwordHash');

    if (!fullAdmin) throw new NotFoundException('Admin not found');

    const valid = await bcrypt.compare(body.currentPassword, fullAdmin.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(body.newPassword, salt);

    await this.adminModel.updateOne(
      { _id: admin._id },
      {
        $set: {
          passwordHash: hash,
          passwordSalt: salt,
          mustChangePassword: false,
        },
      },
    );

    return { success: true, message: 'Password changed successfully' };
  }

  // ════════════════════════════════════════════
  //  ADMIN MANAGEMENT (super_admin)
  // ════════════════════════════════════════════

  async createAdmin(currentAdmin: Admin, body: CreateAdminDto) {
    // Check if email already taken
    const existing = await this.adminModel.findOne({
      email: body.email.toLowerCase().trim(),
    });
    if (existing) throw new ConflictException('Email is already in use');

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(body.password, salt);

    // Use custom permissions or fall back to role defaults
    const permissions =
      body.permissions || ROLE_PERMISSIONS[body.role] || [];

    const newAdmin = await this.adminModel.create({
      _id: new Types.ObjectId(),
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email.toLowerCase().trim(),
      phone: body.phone,
      passwordHash: hash,
      passwordSalt: salt,
      role: body.role,
      permissions,
      isActive: true,
      isEmailConfirmed: true, // Admin-created accounts are pre-confirmed
      mustChangePassword: true, // Force password change on first login
      createdBy: currentAdmin._id as any,
    });

    return {
      success: true,
      message: 'Admin account created successfully',
      data: {
        id: newAdmin._id,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        email: newAdmin.email,
        role: newAdmin.role,
        permissions: newAdmin.permissions,
        mustChangePassword: true,
      },
    };
  }

  async getAllAdmins(currentAdmin: Admin) {
    const admins = await this.adminModel
      .find()
      .select('-passwordHash -passwordSalt -resetPasswordOtp -resetPasswordOtpExpiry')
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, message: 'Admins retrieved', data: admins };
  }

  async getAdminById(id: string) {
    const admin = await this.adminModel
      .findById(id)
      .select('-passwordHash -passwordSalt -resetPasswordOtp -resetPasswordOtpExpiry')
      .lean();

    if (!admin) throw new NotFoundException('Admin not found');

    return { success: true, message: 'Admin retrieved', data: admin };
  }

  async updateAdmin(id: string, body: UpdateAdminDto) {
    const admin = await this.adminModel.findById(id);
    if (!admin) throw new NotFoundException('Admin not found');

    // Prevent deactivating super admin if it's the only one
    if (body.isActive === false && admin.role === AdminRoleEnum.SUPER_ADMIN) {
      const superAdminCount = await this.adminModel.countDocuments({
        role: AdminRoleEnum.SUPER_ADMIN,
        isActive: true,
      });
      if (superAdminCount <= 1) {
        throw new BadRequestException(
          'Cannot deactivate the only active super admin',
        );
      }
    }

    // If role is changed, update default permissions accordingly
    const updateData: any = { ...body };
    if (body.role && !body.permissions) {
      updateData.permissions = ROLE_PERMISSIONS[body.role] || [];
    }

    await this.adminModel.updateOne({ _id: id }, { $set: updateData });

    return {
      success: true,
      message: 'Admin updated successfully',
      data: { id, ...body },
    };
  }

  async resetAdminPassword(id: string, body: ResetAdminPasswordDto) {
    const admin = await this.adminModel.findById(id);
    if (!admin) throw new NotFoundException('Admin not found');

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(body.newPassword, salt);

    await this.adminModel.updateOne(
      { _id: id },
      {
        $set: {
          passwordHash: hash,
          passwordSalt: salt,
          mustChangePassword: true,
          loginFailedCount: 0,
          lockedUntil: null,
        },
      },
    );

    return { success: true, message: 'Password reset successfully. Admin must change on next login.' };
  }

  async deleteAdmin(currentAdmin: Admin, id: string) {
    if (currentAdmin._id.toString() === id) {
      throw new BadRequestException('Cannot delete your own account');
    }

    const admin = await this.adminModel.findById(id);
    if (!admin) throw new NotFoundException('Admin not found');

    if (admin.role === AdminRoleEnum.SUPER_ADMIN) {
      throw new BadRequestException('Cannot delete a super admin account');
    }

    // Soft delete — deactivate instead of removing
    await this.adminModel.updateOne(
      { _id: id },
      { $set: { isActive: false } },
    );

    return { success: true, message: 'Admin account deactivated' };
  }

  // ════════════════════════════════════════════
  //  GET ME (profile)
  // ════════════════════════════════════════════

  async getMe(admin: Admin) {
    const rolePerms = ROLE_PERMISSIONS[admin.role as AdminRoleEnum] || [];
    const allPermissions = [...new Set([...rolePerms, ...(admin.permissions || [])])];

    return {
      success: true,
      message: 'Profile retrieved',
      data: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        permissions: allPermissions,
        profilePhoto: admin.profilePhoto,
        mustChangePassword: admin.mustChangePassword,
        lastLoginDate: admin.lastLoginDate,
        createdAt: admin.createdAt,
      },
    };
  }

  // ════════════════════════════════════════════
  //  LOGOUT
  // ════════════════════════════════════════════

  async logout(admin: Admin, body?: LogoutAdminDto) {
    if (body?.refreshToken) {
      await this.refreshTokenModel.updateOne(
        { token: body.refreshToken, user: admin._id },
        { $set: { revoked: true, isActive: false } },
      );
    } else {
      await this.refreshTokenModel.updateMany(
        { user: admin._id, revoked: false },
        { $set: { revoked: true, isActive: false } },
      );
    }

    return { success: true, message: 'Logged out successfully' };
  }

  // ════════════════════════════════════════════
  //  TOKEN HELPER
  // ════════════════════════════════════════════

  private async generateRefreshToken(admin: Admin): Promise<string> {
    // Revoke all old tokens
    await this.refreshTokenModel.updateMany(
      { user: admin._id, revoked: false },
      { $set: { revoked: true, isActive: false } },
    );

    const tokenString = generateRandomString();
    await this.refreshTokenModel.create({
      _id: new Types.ObjectId(),
      token: tokenString,
      user: admin._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isActive: true,
      revoked: false,
    });

    return tokenString;
  }
}
