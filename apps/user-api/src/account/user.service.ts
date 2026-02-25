import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { updateFCMDto } from '@libs/common';
import { AccountUserRepository } from './repository';
import { UpdateProfileDto, UpdateNotificationPreferencesDto, CreateSavedAddressDto, UpdateSavedAddressDto } from './dto';
import { Types } from 'mongoose';

@Injectable()
export class AccountService {
  constructor(private readonly userRepository: AccountUserRepository) {}

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
