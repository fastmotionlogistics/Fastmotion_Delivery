/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

import { OAuth2Client } from 'google-auth-library';
import { Types } from 'mongoose';
import {
  LoginDto,
  ResetPasswordDto,
  VerifyOtpDto,
  RegisterShopUserDto,
  VerifyPhoneOtpDto,
  ResendOtpDto,
  VerifyEmailOtpDto,
  ResendEmailOtpDto,
  LogoutDto,
} from './dto';
import { User } from '@libs/database';
import { JwtTokenService } from './strategies/jwt.service';
import { GenerateOtp, generateRandomString, Role, timeZoneMoment, phoneFormatter } from '@libs/common';
import { AuthUserRepository, RefreshTokenRepository } from './repository';

// Utility functions - should be moved to @libs/common/utils later

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: AuthUserRepository,
    private readonly refreshTokenReposiotry: RefreshTokenRepository,
    private readonly configService: ConfigService,
    // private readonly jwtService: JwtService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async registerUser(body: RegisterShopUserDto) {
    try {
      // Validate password match
      if (body.password !== body.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }

      // Format phone number
      // const formattedPhone = phoneFormatter(body.phone);

      // Check if phone number already exists
      await this.validateEmailNotExists(body.email);
      // await this.validatePhoneNotExists(formattedPhone);

      // Hash password
      const passSalt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(body.password, passSalt);

      // Generate OTP for phone verification
      const { expiry, otp } = GenerateOtp();

      // Format phone number
      const formattedPhone = phoneFormatter(body.phone);

      // Check phone not already taken
      await this.validatePhoneNotExists(formattedPhone);

      // Create user (PRD 5.1: Full name, Email, Phone, Profile photo, Password)
      const user = await this.userRepository.create({
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: formattedPhone,
        passwordHash,
        passwordSalt: passSalt,
        emailConfirmationCode: otp,
        emailConfirmationExpiryDate: expiry,
        isEmailConfirmed: false,
        isPhoneConfirmed: false,
        isPhotoUpload: !!body.profilePhoto,
        type: Role.NORMAL_USER,
      });

      // TODO: Send OTP via email using notification service
      // await this.notificationService.sendEmail({
      //   to: body.email,
      //   subject: 'FastMotion - Verify your email',
      //   message: `Your FastMotion verification code is: ${otp}. Valid for 10 minutes.`,
      // });

      return {
        success: true,
        message: 'Registration successful. Please verify your email with the OTP sent.',
        data: {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: formattedPhone,
        },
      };
    } catch (error) {
      throw error;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async login(user: User, body?: LoginDto) {
    try {
      // Check if user verified their contact (email or phone)
      const isVerified = user.isEmailConfirmed || user.isPhoneConfirmed;

      if (!isVerified) {
        // For phone users, send OTP via SMS
        // if (user.phone && !user.isPhoneConfirmed) {
        //   const { expiry, otp } = GenerateOtp();
        //   const updateRepo = await this.userRepository.findOneAndUpdate(
        //     { _id: new Types.ObjectId(user._id) },
        //     {
        //       phoneConfirmationOtp: otp,
        //       phoneConfirmationOtpExpiry: expiry,
        //     },
        //   );

        //   // TODO: Send OTP via SMS
        //   console.log(`[DEV] OTP for ${user.phone}: ${otp}`);

        //   return {
        //     success: true,
        //     message: 'Account unverified. OTP sent to your phone.',
        //     data: {
        //       phone: user.phone,
        //       unverified: true,
        //     },
        //   };
        // }

        // For email users, send OTP via email
        if (user.email && !user.isEmailConfirmed) {
          const { expiry, otp } = GenerateOtp();
          const updateRepo = await this.userRepository.findOneAndUpdate(
            { _id: new Types.ObjectId(user._id) },
            {
              emailConfirmationCode: otp,
              emailConfirmationExpiryDate: expiry,
            },
          );

          if (updateRepo) {
            // const verification_token = this.jwtTokenService.generateAccessToken({
            //   email: updateRepo.email,
            //   type: updateRepo.type,
            //   expiry: updateRepo.emailConfirmationExpiryDate,
            // });
            return {
              success: true,
              message: 'Account unverified. OTP sent to your email.',
              data: { email: updateRepo.email, unverified: true },
            };
          }
        }
      } else {
        const refresh_token = await this.generateRefreshToken(user, '');
        const access_token = await this.generateAccessTokens(user, refresh_token);

        if (user.type === Role.NORMAL_USER) {
          // Update FCM token and last login
          body?.fcmToken &&
            (await this.userRepository.findOneAndUpdate(
              { _id: user._id },
              { fcmToken: body.fcmToken, lastLoginDate: timeZoneMoment().toDate() },
            ));

          // Fetch full user data for the response
          const fullUser = await this.userRepository.findById(user._id);

          return {
            success: true,
            message: 'Login successful',
            data: {
              accessToken: access_token,
              refreshToken: refresh_token,
              user: {
                id: fullUser?._id || user._id,
                firstName: fullUser?.firstName || user.firstName,
                lastName: fullUser?.lastName || user.lastName,
                email: fullUser?.email || user.email,
                phone: fullUser?.phone || user.phone,
                isPhotoUpload: fullUser?.isPhotoUpload,
                isProfileUpdated: fullUser?.isProfileUpdated || user.isProfileUpdated,
                isOnboardingComplete: fullUser?.isOnboardingComplete || user.isOnboardingComplete,
                isEmailConfirmed: fullUser?.isEmailConfirmed,
                isPhoneConfirmed: fullUser?.isPhoneConfirmed,
              },
            },
          };
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async forgotPassword(emailOrPhone: string) {
    // Check if input is email or phone
    const isPhone = emailOrPhone.startsWith('+') || /^\d+$/.test(emailOrPhone);

    let user: User;
    let formattedContact: string;

    if (isPhone) {
      formattedContact = phoneFormatter(emailOrPhone);
      user = await this.userRepository.findOne({ phone: formattedContact });

      if (!user) {
        throw new NotFoundException('User with this phone number does not exist');
      }

      const { otp, expiry } = GenerateOtp();

      await this.userRepository.findOneAndUpdate(
        { phone: formattedContact },
        {
          resetPasswordOtp: otp,
          resetPasswordOtpExpiry: expiry,
        },
      );

      // TODO: Send OTP via SMS
      // console.log(`[DEV] Password reset OTP for ${formattedContact}: ${otp}`);

      return {
        success: true,
        message: 'OTP sent to your phone number',
        data: { phone: formattedContact },
      };
    } else {
      user = await this.userRepository.findOne({ email: emailOrPhone });

      if (!user) {
        throw new NotFoundException('User with this email does not exist');
      }

      const { otp, expiry } = GenerateOtp();

      await this.userRepository.findOneAndUpdate(
        { email: emailOrPhone },
        {
          resetPasswordOtp: otp,
          resetPasswordOtpExpiry: expiry,
        },
      );

      // TODO: Send OTP to email
      // console.log(`[DEV] Password reset OTP for ${emailOrPhone}: ${otp}`);

      return {
        success: true,
        message: 'OTP sent to your email',
        data: { email: emailOrPhone },
      };
    }
  }

  async googleSignIn(accessToken: string) {
    try {
      const client = new OAuth2Client({
        clientId: this.configService.getOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
        clientSecret: this.configService.getOrThrow('GOOGLE_OAUTH_CLIENT_SECRET'),
      });
      const ticket = await client.verifyIdToken({
        idToken: accessToken,
        audience: this.configService.getOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
      });
      const payload = ticket.getPayload();
      const user = await this.userRepository.findOne({ email: payload.email, isSocialLogin: true });
      if (user) {
        return await this.login(user);
      }
      throw new NotFoundException('No account found. Please sign up.');
    } catch (error) {
      throw error;
    }
  }

  async googleSignUp(accessToken: string, ipAddress?: string) {
    try {
      const client = new OAuth2Client({
        clientId: this.configService.getOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
        clientSecret: this.configService.getOrThrow('GOOGLE_OAUTH_CLIENT_SECRET'),
      });
      const ticket = await client.verifyIdToken({
        idToken: accessToken,
        audience: this.configService.getOrThrow('GOOGLE_OAUTH_CLIENT_ID'),
      });
      const payload = ticket.getPayload();

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        email: payload.email,
      });
      if (existingUser) {
        throw new ConflictException('User already exists. Please sign in.');
      }

      // Create new user
      const passSalt = await bcrypt.genSalt();
      const randomPassword = await bcrypt.hash(generateRandomString(8), passSalt);

      const user = await this.userRepository.create({
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name,
        passwordHash: randomPassword,
        passwordSalt: passSalt,
        isEmailConfirmed: true,
        isSocialLogin: true,
        emailConfirmationDate: timeZoneMoment().toDate(),
      });

      const refresh_token = await this.generateRefreshToken(user, ipAddress);
      const access_token = await this.generateAccessTokens(user);

      return {
        success: true,
        refreshToken: refresh_token,
        accessToken: access_token,
        needsOnboarding: true,
      };
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(data: ResetPasswordDto) {
    // Check if identifier is email or phone
    const isPhone = data.email.startsWith('+') || /^\d+$/.test(data.email);

    let user: User;
    let queryField: any;

    if (isPhone) {
      const formattedPhone = phoneFormatter(data.email);
      user = await this.userRepository.findOne({ phone: formattedPhone });
      queryField = { phone: formattedPhone };

      if (!user) {
        throw new NotFoundException('User with this phone number does not exist');
      }
    } else {
      user = await this.userRepository.findOne({ email: data.email });
      queryField = { email: data.email };

      if (!user) {
        throw new NotFoundException('User with this email does not exist');
      }
    }

    // Verify OTP
    if (
      !user.resetPasswordOtp ||
      !user.resetPasswordOtpExpiry ||
      user.resetPasswordOtp !== data.otp ||
      timeZoneMoment(user.resetPasswordOtpExpiry).toDate() < timeZoneMoment().toDate()
    ) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Hash new password
    const passSalt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(data.password, passSalt);

    // Update password and clear OTP
    await this.userRepository.findOneAndUpdate(queryField, {
      passwordHash,
      passwordSalt: passSalt,
      resetPasswordCount: user.resetPasswordCount + 1,

      resetPasswordOtp: null,
      resetPasswordOtpExpiry: null,
    });

    return { success: true, message: 'Password reset successful' };
  }

  async verifyUserOtp(verifyToken: VerifyOtpDto, ipAddress: string) {
    try {
      const decodedToken = this.jwtTokenService.verifyToken(verifyToken.verificationToken);
      if (timeZoneMoment(decodedToken?.expiry).toDate() < timeZoneMoment().toDate())
        throw new BadRequestException('Verification Tokenn Expired');

      const res = await this.userRepository.model.findOne({
        email: decodedToken?.email,
        isEmailConfirmed: false,
      });

      if (res && !res.isEmailConfirmed) {
        if (res.emailConfirmationCode === verifyToken.otpCode) {
          if (decodedToken?.type === Role.NORMAL_USER) {
            const refreshToken = await this.generateRefreshToken(res, ipAddress);
            const accessToken = await this.generateAccessTokens(res);

            const dd = await this.userRepository.findOneAndUpdate({ email: res.email }, { isEmailConfirmed: true });
            // TODO: Create wallet via wallet service or event emission
            return {
              success: true,
              data: {
                refreshToken,
                accessToken,

                isProfileUpdated: dd.isProfileUpdated,
                needsOnboarding: true,
              },
            };
          }
        } else {
          throw new BadRequestException('Incorrect OTP Code.');
        }
      } else if (res && res.isEmailConfirmed) {
        return {
          success: false,
          message: 'Email has Already been confirmed',
        };
      }
    } catch (err) {
      if (err.message.includes('expired')) {
        throw new UnauthorizedException('Token Has Expired! Please Try Again.');
      } else {
        throw new UnauthorizedException(err?.message ?? 'Error Verifying');
      }
    }
  }

  async generateRefreshToken(user: User, ipAddress: string) {
    try {
      const prevRefresh = await this.refreshTokenReposiotry.findOne({
        user: user._id,
        revoked: false,
        isActive: true,
      });

      if (
        prevRefresh &&
        prevRefresh.isActive &&
        timeZoneMoment(prevRefresh.expiresAt).toDate() > timeZoneMoment().toDate()
      ) {
        return prevRefresh.token;
      } else {
        // Revoke all previous active tokens for this user
        await this.refreshTokenReposiotry.revokeAllUserTokens(user._id);

        // Create new refresh token
        const res = await this.refreshTokenReposiotry.create({
          expiresAt: timeZoneMoment().add(7, 'days').toDate(),
          user: user._id,
          token: generateRandomString(),
          ipAddress: ipAddress,
        });
        return res.token;
      }
    } catch (error) {
      throw error;
    }
  }

  async generateAccessTokens(user: User, refresh_token?: string) {
    const accessTokenPayload = {
      user_id: user._id,
      email: user.email,
    };
    const access_token = this.jwtTokenService.generateAccessToken(accessTokenPayload);
    return access_token;
  }

  private async validateCreateUser(email: string) {
    const res = await this.userRepository.findOne({
      email: email,
    });
    if (res) {
      throw new ConflictException('Email Already Exists');
    } else {
      return;
    }
  }

  async verifyUser(emailOrPhone: string, password: string): Promise<User | never> {
    // Check if input is email or phone
    const isPhone = emailOrPhone.startsWith('+') || /^\d+$/.test(emailOrPhone);

    let query: any;
    if (isPhone) {
      const formattedPhone = phoneFormatter(emailOrPhone);
      query = { phone: formattedPhone };
    } else {
      query = { email: emailOrPhone };
    }

    const theuser = await this.userRepository.model
      .findOne(query)
      .select(
        'passwordSalt passwordHash isEmailConfirmed isPhoneConfirmed type email phone firstName lastName isOnboardingComplete isProfileUpdated isPhotoUpload isActive',
      );

    if (!theuser) {
      throw new UnauthorizedException('User does not exist');
    }

    // Check if account is active
    if (theuser.isActive === false) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact support.');
    }

    // Verify password using bcrypt.compare instead of hash
    const isPasswordValid = await bcrypt.compare(password, theuser.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return theuser;
  }

  async getUser({ _id }) {
    try {
      return await this.userRepository.findOne({
        _id: _id,
      });
    } catch (error) {
      throw new UnauthorizedException('User Does Not Exist');
    }
  }

  async verifyPhoneOtp(body: VerifyPhoneOtpDto, ipAddress: string) {
    try {
      const formattedPhone = phoneFormatter(body.phone);

      // Find user by phone
      const user = await this.userRepository.findOne({
        phone: formattedPhone,
        isPhoneConfirmed: false,
      });

      if (!user) {
        throw new NotFoundException('User not found or already verified');
      }

      // Verify OTP
      if (
        !user.phoneConfirmationOtp ||
        !user.phoneConfirmationOtpExpiry ||
        user.phoneConfirmationOtp !== body.otpCode
      ) {
        throw new BadRequestException('Invalid OTP code');
      }

      // Check OTP expiry
      if (timeZoneMoment(user.phoneConfirmationOtpExpiry).toDate() < timeZoneMoment().toDate()) {
        throw new BadRequestException('OTP has expired. Please request a new one.');
      }

      // Mark phone as confirmed
      const updatedUser = await this.userRepository.findOneAndUpdate(
        { _id: user._id },
        {
          isPhoneConfirmed: true,
          phoneConfirmationDate: timeZoneMoment().toDate(),
          phoneConfirmationOtp: null,
          phoneConfirmationOtpExpiry: null,
        },
      );

      // Generate tokens
      const refreshToken = await this.generateRefreshToken(updatedUser, ipAddress);
      const accessToken = await this.generateAccessTokens(updatedUser);

      // TODO: Create wallet via event emission
      // this.eventEmitter.emit('user.registered', { userId: updatedUser._id });

      return {
        success: true,
        message: 'Phone verified successfully',
        data: {
          accessToken,
          refreshToken,

          isProfileUpdated: updatedUser.isProfileUpdated,
          isOnboardingComplete: updatedUser.isOnboardingComplete || false,
          // needsShopSetup: !updatedUser.ownerName || !updatedUser.shopAddress,
        },
      };
    } catch (error) {
      throw error;
    }
  }
  async verifyEmailOtp(body: VerifyEmailOtpDto, ipAddress: string) {
    try {
      // const formattedPhone = phoneFormatter(body.phone);

      // Find user by phone
      const user = await this.userRepository.findOne({
        email: body.email,
        isEmailConfirmed: false,
      });

      if (!user) {
        throw new NotFoundException('User not found or already verified');
      }

      // Verify OTP
      if (
        !user.emailConfirmationCode ||
        !user.emailConfirmationExpiryDate ||
        user.emailConfirmationCode !== body.otpCode
      ) {
        throw new BadRequestException('Invalid OTP code');
      }

      // Check OTP expiry
      if (timeZoneMoment(user.emailConfirmationExpiryDate).toDate() < timeZoneMoment().toDate()) {
        throw new BadRequestException('OTP has expired. Please request a new one.');
      }

      // Mark email as confirmed (also set isPhoneConfirmed since email is primary)
      const updatedUser = await this.userRepository.findOneAndUpdate(
        { _id: user._id },
        {
          isEmailConfirmed: true,
          emailConfirmationDate: timeZoneMoment().toDate(),
          lastLoginDate: timeZoneMoment().toDate(),
          emailConfirmationCode: null,
          emailConfirmationExpiryDate: null,
        },
      );

      // Generate tokens
      const refreshToken = await this.generateRefreshToken(updatedUser, ipAddress);
      const accessToken = await this.generateAccessTokens(updatedUser);

      // TODO: Create wallet via event emission
      // this.eventEmitter.emit('user.registered', { userId: updatedUser._id });

      return {
        success: true,
        message: 'Email verified successfully',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: updatedUser._id,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            phone: updatedUser.phone,
            isProfileUpdated: updatedUser.isProfileUpdated,
            isOnboardingComplete: updatedUser.isOnboardingComplete || false,
            isEmailConfirmed: true,
          },
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async resendPhoneOtp(body: ResendOtpDto) {
    try {
      const formattedPhone = phoneFormatter(body.phone);

      // Find user by phone
      const user = await this.userRepository.findOne({
        phone: formattedPhone,
        isPhoneConfirmed: false,
      });

      if (!user) {
        throw new NotFoundException('User not found or already verified');
      }

      // Generate new OTP
      const { expiry, otp } = GenerateOtp();

      // Update user with new OTP
      await this.userRepository.findOneAndUpdate(
        { _id: user._id },
        {
          phoneConfirmationOtp: otp,
          phoneConfirmationOtpExpiry: expiry,
        },
      );

      // TODO: Send OTP via SMS using notification service
      // await this.notificationService.sendSms({
      //   to: formattedPhone,
      //   message: `Your BreadBoy verification code is: ${otp}. Valid for 10 minutes.`,
      // });

      console.log(`[DEV] New OTP for ${formattedPhone}: ${otp}`); // For development

      return {
        success: true,
        message: 'OTP resent successfully',
      };
    } catch (error) {
      throw error;
    }
  }
  async resendEmailOtp(body: ResendEmailOtpDto) {
    try {
      // Find user by phone
      const user = await this.userRepository.findOne({
        email: body.email,
        isEmailConfirmed: false,
      });

      if (!user) {
        throw new NotFoundException('User not found or already verified');
      }

      // Generate new OTP
      const { expiry, otp } = GenerateOtp();

      // Update user with new OTP
      await this.userRepository.findOneAndUpdate(
        { _id: user._id },
        {
          emailConfirmationCode: otp,
          emailConfirmationExpiryDate: expiry,
        },
      );

      // TODO: Send OTP via SMS using notification service
      // await this.notificationService.sendSms({
      //   to: formattedPhone,
      //   message: `Your BreadBoy verification code is: ${otp}. Valid for 10 minutes.`,
      // });

      // console.log(`[DEV] New OTP for ${body.email}: ${otp}`); // For development

      return {
        success: true,
        message: 'OTP resent successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  private async validatePhoneNotExists(phone: string) {
    const existingUser = await this.userRepository.findOne({ phone });
    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }
  }
  private async validateEmailNotExists(email: string) {
    const existingUser = await this.userRepository.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }
  }

  async logout(user: User, logoutDto?: LogoutDto) {
    try {
      // Revoke refresh token(s)
      if (logoutDto?.refreshToken) {
        // Revoke specific refresh token
        const revoked = await this.refreshTokenReposiotry.revokeToken(logoutDto.refreshToken);
        if (!revoked) {
          throw new NotFoundException('Refresh token not found');
        }
      } else {
        // Revoke all active tokens for the user
        await this.refreshTokenReposiotry.revokeAllUserTokens(user._id);
      }

      // Disable mobile notifications
      await this.userRepository.findOneAndUpdate(
        { _id: user._id },
        {
          mobileNotification: false,
        },
      );

      return {
        success: true,
        message: 'Logged out successfully. Mobile notifications disabled.',
      };
    } catch (error) {
      throw error;
    }
  }
}
