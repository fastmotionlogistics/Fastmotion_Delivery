import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { GenerateOtp, updateFCMDto } from '@libs/common';
import { EmailNotificationService } from '@libs/common';
import { AccountUserRepository } from './repository';
import { UpdateProfileDto, UpdateNotificationPreferencesDto, CreateSavedAddressDto, ChangePasswordConfirmDto } from './dto';
import { Types } from 'mongoose';

@Injectable()
export class AccountService {
  constructor(
    private readonly userRepository: AccountUserRepository,
    private readonly emailService: EmailNotificationService,
  ) {}

  /**
   * Get full user profile
   */
  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'Profile retrieved',
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        dob: user.dob,
        isEmailConfirmed: user.isEmailConfirmed,
        isPhoneConfirmed: user.isPhoneConfirmed,
        isPhotoUpload: user.isPhotoUpload,
        profilePhotoUrl: user.profilePhotoUrl,
        isProfileUpdated: user.isProfileUpdated,
        isOnboardingComplete: user.isOnboardingComplete,
        emailNotification: user.emailNotification,
        mobileNotification: user.mobileNotification,
        deliveryNotification: user.deliveryNotification,
        paymentNotification: user.paymentNotification,
        disputeNotification: user.disputeNotification,
        promoNotification: user.promoNotification,
        latitude: user.latitude,
        longitude: user.longitude,
        createdAt: (user as any).createdAt,
      },
    };
  }

  /**
   * Update user profile (PRD 5.1 fields: name, phone, photo)
   */
  async updateProfile(userId: string, body: UpdateProfileDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Record<string, any> = {};

    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.dob !== undefined) updateData.dob = new Date(body.dob);
    if (body.profilePhoto !== undefined) {
      updateData.isPhotoUpload = true;
      updateData.profilePhotoUrl = body.profilePhoto;
    }
    if (body.latitude !== undefined) updateData.latitude = body.latitude;
    if (body.longitude !== undefined) updateData.longitude = body.longitude;

    // Mark profile as updated if key fields are present
    if (body.firstName && body.lastName) {
      updateData.isProfileUpdated = true;
    }

    // Mark onboarding complete if all required fields present
    const updatedFirstName = body.firstName || user.firstName;
    const updatedLastName = body.lastName || user.lastName;
    const updatedPhone = body.phone || user.phone;
    if (updatedFirstName && updatedLastName && updatedPhone && user.email) {
      updateData.isOnboardingComplete = true;
    }

    const updatedUser = await this.userRepository.model
      .findOneAndUpdate({ _id: userId }, { $set: updateData }, { new: true })
      .select('-passwordHash -passwordSalt -fcmToken -emailConfirmationCode -resetPasswordOtp');

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        gender: updatedUser.gender,
        isProfileUpdated: updatedUser.isProfileUpdated,
        isOnboardingComplete: updatedUser.isOnboardingComplete,
      },
    };
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(userId: string, body: UpdateNotificationPreferencesDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Record<string, any> = {};
    if (body.emailNotification !== undefined) updateData.emailNotification = body.emailNotification;
    if (body.mobileNotification !== undefined) updateData.mobileNotification = body.mobileNotification;
    if (body.deliveryNotification !== undefined) updateData.deliveryNotification = body.deliveryNotification;
    if (body.paymentNotification !== undefined) updateData.paymentNotification = body.paymentNotification;
    if (body.disputeNotification !== undefined) updateData.disputeNotification = body.disputeNotification;
    if (body.promoNotification !== undefined) updateData.promoNotification = body.promoNotification;

    await this.userRepository.model.findOneAndUpdate(
      { _id: userId },
      { $set: updateData },
      { new: true },
    );

    return {
      success: true,
      message: 'Notification preferences updated',
      data: {
        emailNotification: body.emailNotification ?? user.emailNotification,
        mobileNotification: body.mobileNotification ?? user.mobileNotification,
        deliveryNotification: body.deliveryNotification ?? user.deliveryNotification,
        paymentNotification: body.paymentNotification ?? user.paymentNotification,
        disputeNotification: body.disputeNotification ?? user.disputeNotification,
        promoNotification: body.promoNotification ?? user.promoNotification,
      },
    };
  }

  /**
   * Update FCM token for push notifications
   */
  async updateFCMToken(userId: string, updateDto: updateFCMDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User Does Not Exist');
    }

    await this.userRepository.model
      .findOneAndUpdate({ _id: userId }, { $set: { fcmToken: updateDto.fcmToken } }, { new: true })
      .select('-fcmToken');

    return {
      success: true,
      message: 'FCM token updated successfully',
    };
  }

  // ═══════════ SAVED ADDRESSES ═══════════

  private static MAX_SAVED_ADDRESSES = 5;

  async getSavedAddresses(userId: string) {
    const addresses = await this.userRepository.savedAddressModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      message: 'Saved addresses retrieved',
      data: addresses,
    };
  }

  async createSavedAddress(userId: string, body: CreateSavedAddressDto) {
    const count = await this.userRepository.savedAddressModel.countDocuments({
      userId: new Types.ObjectId(userId),
    });

    if (count >= AccountService.MAX_SAVED_ADDRESSES) {
      throw new BadRequestException(
        `Maximum of ${AccountService.MAX_SAVED_ADDRESSES} saved addresses allowed. Please delete one first.`,
      );
    }

    const address = await this.userRepository.savedAddressModel.create({
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(userId),
      ...body,
    });

    return {
      success: true,
      message: 'Address saved',
      data: address,
    };
  }

  async deleteSavedAddress(userId: string, addressId: string) {
    const address = await this.userRepository.savedAddressModel.findOne({
      _id: addressId,
      userId: new Types.ObjectId(userId),
    });

    if (!address) {
      throw new NotFoundException('Saved address not found');
    }

    await this.userRepository.savedAddressModel.deleteOne({ _id: addressId });

    return {
      success: true,
      message: 'Address deleted',
    };
  }

  // ═══════════ CHANGE PASSWORD ═══════════

  async requestChangePasswordOtp(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (!user.email) throw new BadRequestException('No email address on file');

    const { otp, expiry } = GenerateOtp();

    await this.userRepository.model.updateOne(
      { _id: userId },
      { $set: { resetPasswordOtp: otp, resetPasswordOtpExpiry: expiry } },
    );

    await this.emailService.sendEmail({
      to: user.email,
      subject: 'FastMotion — Change Password OTP',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#1f2937;margin-bottom:8px;">Change Password</h2>
          <p style="color:#6b7280;">Use the OTP below to confirm your password change. It expires in <strong>10 minutes</strong>.</p>
          <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
            <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111827;">${otp}</span>
          </div>
          <p style="color:#9ca3af;font-size:13px;">If you did not request a password change, you can safely ignore this email.</p>
        </div>
      `,
    });

    return {
      success: true,
      message: `OTP sent to ${user.email}`,
    };
  }

  async confirmChangePassword(userId: string, body: ChangePasswordConfirmDto) {
    if (body.newPassword !== body.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.userRepository.model
      .findById(userId)
      .select('+resetPasswordOtp +resetPasswordOtpExpiry')
      .lean();

    if (!user) throw new NotFoundException('User not found');
    if (!user.resetPasswordOtp) throw new BadRequestException('No OTP requested');
    if (user.resetPasswordOtp !== body.otp) throw new BadRequestException('Invalid OTP');
    if (new Date() > new Date(user.resetPasswordOtpExpiry)) {
      throw new BadRequestException('OTP has expired');
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(body.newPassword, salt);

    await this.userRepository.model.updateOne(
      { _id: userId },
      {
        $set: { passwordHash, passwordSalt: salt },
        $unset: { resetPasswordOtp: '', resetPasswordOtpExpiry: '' },
      },
    );

    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * Soft-delete / deactivate account
   */
  async deleteAccount(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.model.findOneAndUpdate(
      { _id: userId },
      { $set: { isActive: false } },
    );

    return {
      success: true,
      message: 'Account deactivated successfully',
    };
  }
}
