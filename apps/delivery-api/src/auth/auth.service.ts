import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Rider, RefreshToken } from '@libs/database';
import { GenerateOtp, generateRandomString, phoneFormatter, timeZoneMoment } from '@libs/common';
import { JwtTokenService } from './strategies/jwt.service';
import {
  RegisterRiderDto,
  LoginRiderDto,
  VerifyOtpDto,
  ResendOtpDto,
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

  async register(body: RegisterRiderDto) {
    // TODO: Implement rider registration
    return {
      success: true,
      message: 'Registration successful. OTP sent to your email.',
      data: { email: body.email },
    };
  }

  async login(rider: Rider, body?: LoginRiderDto) {
    // TODO: Implement rider login
    return {
      success: true,
      message: 'Login successful',
      data: null,
    };
  }

  async verifyOtp(body: VerifyOtpDto, ipAddress: string) {
    // TODO: Implement OTP verification
    return {
      success: true,
      message: 'OTP verified successfully',
      data: null,
    };
  }

  async resendOtp(body: ResendOtpDto) {
    // TODO: Implement resend OTP
    return {
      success: true,
      message: 'OTP resent successfully',
    };
  }

  async forgotPassword(body: ForgotPasswordDto) {
    // TODO: Implement forgot password
    return {
      success: true,
      message: 'OTP sent to your email/phone',
    };
  }

  async resetPassword(body: ResetPasswordDto) {
    // TODO: Implement reset password
    return {
      success: true,
      message: 'Password reset successful',
    };
  }

  async logout(rider: Rider, body?: LogoutDto) {
    // TODO: Implement logout
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async verifyRider(emailOrPhone: string, password: string): Promise<Rider | null> {
    // Check if input is email or phone
    const isPhone = emailOrPhone.startsWith('+') || /^\d+$/.test(emailOrPhone);

    let query: any;
    if (isPhone) {
      const formattedPhone = phoneFormatter(emailOrPhone);
      query = { phone: formattedPhone };
    } else {
      query = { email: emailOrPhone };
    }

    const rider = await this.riderModel
      .findOne(query)
      .select('+passwordHash +passwordSalt');

    if (!rider) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, rider.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return rider;
  }

  async getRider({ _id }) {
    return await this.riderModel.findOne({ _id });
  }
}
