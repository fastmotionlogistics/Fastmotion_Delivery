import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Rider, RefreshToken } from '@libs/database';
import { GenerateOtp, generateRandomString, phoneFormatter, timeZoneMoment, RiderStatusEnum } from '@libs/common';
import { JwtTokenService } from './strategies/jwt.service';
import {
  LoginRiderDto,
  VerifyBikeDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  LogoutDto,
} from './dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Rider.name) private readonly riderModel: Model<Rider>,
    @InjectModel(RefreshToken.name) private readonly refreshTokenModel: Model<RefreshToken>,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  // ════════════════════════════════════════════
  //  LOGIN (email or phone — no signup)
  // ════════════════════════════════════════════

  async login(rider: Rider, body: LoginRiderDto) {
    // 1. Check if rider is active
    if (!rider.isActive) {
      throw new ForbiddenException('Your account has been deactivated. Please contact admin.');
    }

    // 2. Check if rider is suspended
    if (rider.isSuspended) {
      throw new ForbiddenException(`Your account is suspended. Reason: ${rider.suspensionReason || 'Contact admin'}`);
    }

    // 3. Enforce device binding — only the registered device can log in
    if (rider.enforceDeviceBinding && rider.boundDeviceId) {
      if (!body.deviceId) {
        throw new BadRequestException('Device identification is required');
      }
      if (body.deviceId !== rider.boundDeviceId) {
        throw new ForbiddenException(
          'This account is bound to a different device. Only the registered device can sign in. Contact admin if you need to change devices.',
        );
      }
    }

    // 4. First-time login — bind device if not yet bound and deviceId is provided
    if (rider.enforceDeviceBinding && !rider.boundDeviceId && body.deviceId) {
      await this.riderModel.updateOne(
        { _id: rider._id },
        {
          $set: {
            boundDeviceId: body.deviceId,
            boundDeviceModel: body.deviceModel || null,
            deviceBoundAt: new Date(),
          },
        },
      );
    }

    // 5. Generate tokens
    const refreshToken = await this.generateRefreshToken(rider);
    const accessToken = this.jwtTokenService.generateAccessToken({
      rider_id: rider._id,
      email: rider.email,
    });

    // 6. Update FCM token + last login
    const updateFields: any = { lastLoginDate: new Date() };
    if (body.fcmToken) updateFields.fcmToken = body.fcmToken;
    await this.riderModel.updateOne({ _id: rider._id }, { $set: updateFields });

    return {
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        rider: {
          id: rider._id,
          firstName: rider.firstName,
          lastName: rider.lastName,
          email: rider.email,
          phone: rider.phone,
          profilePhoto: rider.profilePhoto,
          vehicleType: rider.vehicleType,
          vehiclePlateNumber: rider.vehiclePlateNumber,
          verificationStatus: rider.verificationStatus,
          isVehicleBound: rider.isVehicleBound,
          boundVehicleId: rider.boundVehicleId,
          isOnline: rider.isOnline,
          status: rider.status,
        },
        // Tell the app whether bike verification is needed
        requiresBikeVerification: !rider.isVehicleBound || !rider.boundVehicleId,
      },
    };
  }

  // ════════════════════════════════════════════
  //  VERIFY & BIND BIKE ID (post-login step)
  // ════════════════════════════════════════════

  async verifyBike(rider: Rider, body: VerifyBikeDto) {
    // If rider already has a bound vehicle, check it matches
    if (rider.isVehicleBound && rider.boundVehicleId) {
      if (body.bikeId.toUpperCase() !== rider.boundVehicleId.toUpperCase()) {
        throw new BadRequestException(
          'This Bike ID does not match the vehicle assigned to your account. Contact admin if your vehicle has changed.',
        );
      }

      return {
        success: true,
        message: 'Bike verified successfully',
        data: {
          bikeId: rider.boundVehicleId,
          vehiclePlateNumber: rider.vehiclePlateNumber,
          verified: true,
        },
      };
    }

    // First time — bind the bike
    await this.riderModel.updateOne(
      { _id: rider._id },
      {
        $set: {
          isVehicleBound: true,
          boundVehicleId: body.bikeId.toUpperCase(),
          vehicleBoundAt: new Date(),
          vehiclePlateNumber: body.vehiclePlateNumber || rider.vehiclePlateNumber,
        },
      },
    );

    return {
      success: true,
      message: 'Bike verified and bound to your account',
      data: {
        bikeId: body.bikeId.toUpperCase(),
        vehiclePlateNumber: body.vehiclePlateNumber || rider.vehiclePlateNumber,
        verified: true,
      },
    };
  }

  // ════════════════════════════════════════════
  //  FORGOT PASSWORD
  // ════════════════════════════════════════════

  async forgotPassword(body: ForgotPasswordDto) {
    const isPhone = body.emailOrPhone.startsWith('+') || /^\d+$/.test(body.emailOrPhone);

    let query: any;
    if (isPhone) {
      query = { phone: phoneFormatter(body.emailOrPhone) };
    } else {
      query = { email: body.emailOrPhone.toLowerCase().trim() };
    }

    const rider = await this.riderModel.findOne(query);
    if (!rider) {
      throw new NotFoundException('No account found with this credential');
    }

    const { otp, expiry } = GenerateOtp();

    await this.riderModel.updateOne(
      { _id: rider._id },
      { $set: { resetPasswordOtp: otp, resetPasswordOtpExpiry: expiry } },
    );

    // TODO: Send OTP via email or SMS through NotificationService

    return {
      success: true,
      message: `OTP sent to your ${isPhone ? 'phone' : 'email'}`,
      data: { destination: isPhone ? query.phone : query.email },
    };
  }

  // ════════════════════════════════════════════
  //  RESET PASSWORD
  // ════════════════════════════════════════════

  async resetPassword(body: ResetPasswordDto) {
    if (body.password !== body.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const isPhone = body.emailOrPhone.startsWith('+') || /^\d+$/.test(body.emailOrPhone);
    let query: any;
    if (isPhone) {
      query = { phone: phoneFormatter(body.emailOrPhone) };
    } else {
      query = { email: body.emailOrPhone.toLowerCase().trim() };
    }

    const rider = await this.riderModel
      .findOne(query)
      .select('+resetPasswordOtp +resetPasswordOtpExpiry');

    if (!rider) {
      throw new NotFoundException('No account found');
    }

    // Verify OTP
    if (
      !rider.resetPasswordOtp ||
      !rider.resetPasswordOtpExpiry ||
      rider.resetPasswordOtp !== body.otp ||
      new Date(rider.resetPasswordOtpExpiry) < new Date()
    ) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(body.password, salt);

    await this.riderModel.updateOne(
      { _id: rider._id },
      {
        $set: {
          passwordHash: hash,
          passwordSalt: salt,
          resetPasswordOtp: null,
          resetPasswordOtpExpiry: null,
        },
      },
    );

    return { success: true, message: 'Password reset successful' };
  }

  // ════════════════════════════════════════════
  //  LOGOUT
  // ════════════════════════════════════════════

  async logout(rider: Rider, body?: LogoutDto) {
    // Revoke refresh tokens
    if (body?.refreshToken) {
      await this.refreshTokenModel.updateOne(
        { token: body.refreshToken, user: rider._id },
        { $set: { revoked: true, isActive: false } },
      );
    } else {
      await this.refreshTokenModel.updateMany(
        { user: rider._id, revoked: false },
        { $set: { revoked: true, isActive: false } },
      );
    }

    // Set rider offline
    await this.riderModel.updateOne(
      { _id: rider._id },
      { $set: { isOnline: false, status: RiderStatusEnum.OFFLINE, fcmToken: null } },
    );

    return { success: true, message: 'Logged out successfully' };
  }

  // ════════════════════════════════════════════
  //  LOCAL STRATEGY HELPER
  // ════════════════════════════════════════════

  async verifyRider(emailOrPhone: string, password: string): Promise<Rider | null> {
    const isPhone = emailOrPhone.startsWith('+') || /^\d+$/.test(emailOrPhone);

    let query: any;
    if (isPhone) {
      query = { phone: phoneFormatter(emailOrPhone) };
    } else {
      query = { email: emailOrPhone.toLowerCase().trim() };
    }

    const rider = await this.riderModel
      .findOne(query)
      .select('+passwordHash +passwordSalt +boundDeviceId');

    if (!rider) return null;

    if (!rider.isActive) return null;

    const valid = await bcrypt.compare(password, rider.passwordHash);
    if (!valid) return null;

    return rider;
  }

  async getRider({ _id }) {
    return await this.riderModel.findOne({ _id });
  }

  // ════════════════════════════════════════════
  //  TOKEN HELPERS
  // ════════════════════════════════════════════

  private async generateRefreshToken(rider: Rider): Promise<string> {
    // Revoke all old tokens
    await this.refreshTokenModel.updateMany(
      { user: rider._id, revoked: false },
      { $set: { revoked: true, isActive: false } },
    );

    // Check if there's a still-valid token
    const existing = await this.refreshTokenModel.findOne({
      user: rider._id,
      revoked: false,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (existing) return existing.token;

    const tokenString = generateRandomString();
    await this.refreshTokenModel.create({
      _id: new Types.ObjectId(),
      token: tokenString,
      user: rider._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isActive: true,
      revoked: false,
    });

    return tokenString;
  }
}
