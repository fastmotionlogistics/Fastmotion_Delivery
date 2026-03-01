import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rider, RiderDocument } from '@libs/database';
import {
  UpdateProfileDto,
  UpdateVehicleDto,
  UploadDocumentDto,
  UpdateBankDetailsDto,
  UpdateLocationDto,
  UpdateFcmTokenDto,
} from './dto';
import { MonnifyService } from '@libs/common/modules/monnify';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(Rider.name)
    private readonly riderModel: Model<RiderDocument>,
    private readonly monnifyService: MonnifyService,
  ) {}

  async getProfile(rider: Rider) {
    return {
      success: true,
      message: 'Profile retrieved',
      data: rider,
    };
  }

  async updateProfile(rider: Rider, body: UpdateProfileDto) {
    const updateFields: Record<string, any> = {};
    if (body.firstName) updateFields.firstName = body.firstName;
    if (body.lastName) updateFields.lastName = body.lastName;
    if (body.gender) updateFields.gender = body.gender;
    if (body.dob) updateFields.dob = body.dob;
    if (body.address) updateFields.address = body.address;
    if (body.city) updateFields.city = body.city;
    if (body.state) updateFields.state = body.state;

    if (Object.keys(updateFields).length > 0) {
      await this.riderModel.updateOne({ _id: rider._id }, { $set: updateFields });
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updateFields,
    };
  }

  async updateVehicle(rider: Rider, body: UpdateVehicleDto) {
    const updateFields: Record<string, any> = {};
    if (body.vehicleType) updateFields.vehicleType = body.vehicleType;
    if (body.vehiclePlateNumber) updateFields.vehiclePlateNumber = body.vehiclePlateNumber;
    if (body.vehicleModel) updateFields.vehicleModel = body.vehicleModel;
    if (body.vehicleColor) updateFields.vehicleColor = body.vehicleColor;

    if (Object.keys(updateFields).length > 0) {
      await this.riderModel.updateOne({ _id: rider._id }, { $set: updateFields });
    }

    return {
      success: true,
      message: 'Vehicle information updated',
      data: updateFields,
    };
  }

  async uploadDocument(rider: Rider, body: UploadDocumentDto) {
    const updateFields: Record<string, any> = {};
    updateFields[body.documentType] = body.documentUrl;

    await this.riderModel.updateOne({ _id: rider._id }, { $set: updateFields });

    return {
      success: true,
      message: 'Document uploaded successfully',
      data: { documentType: body.documentType },
    };
  }

  async updateBankDetails(rider: Rider, body: UpdateBankDetailsDto) {
    await this.riderModel.updateOne(
      { _id: rider._id },
      {
        $set: {
          bankName: body.bankName,
          bankCode: body.bankCode,
          bankAccountNumber: body.bankAccountNumber,
          bankAccountName: body.bankAccountName,
        },
      },
    );

    return {
      success: true,
      message: 'Bank details updated',
      data: {
        bankName: body.bankName,
        bankCode: body.bankCode,
        bankAccountNumber: body.bankAccountNumber,
        bankAccountName: body.bankAccountName,
      },
    };
  }

  async updateLocation(rider: Rider, body: UpdateLocationDto) {
    await this.riderModel.updateOne(
      { _id: rider._id },
      {
        $set: {
          currentLatitude: body.latitude,
          currentLongitude: body.longitude,
          lastLocationUpdate: new Date(),
        },
      },
    );

    return {
      success: true,
      message: 'Location updated',
      data: {
        latitude: body.latitude,
        longitude: body.longitude,
        updatedAt: new Date(),
      },
    };
  }

  async updateFcmToken(rider: Rider, body: UpdateFcmTokenDto) {
    await this.riderModel.updateOne(
      { _id: rider._id },
      { $set: { fcmToken: body.fcmToken } },
    );

    return {
      success: true,
      message: 'FCM token updated',
      data: null,
    };
  }

  // ═══════════════════════════════════════════════
  //  BANK LIST (Monnify)
  // ═══════════════════════════════════════════════

  async getBankList() {
    const banks = await this.monnifyService.getBankList();

    return {
      success: true,
      message: 'Bank list retrieved',
      data: banks,
    };
  }

  // ═══════════════════════════════════════════════
  //  VALIDATE ACCOUNT (Monnify)
  // ═══════════════════════════════════════════════

  async validateBankAccount(accountNumber: string, bankCode: string) {
    if (!accountNumber || accountNumber.length !== 10) {
      throw new BadRequestException('Account number must be 10 digits');
    }
    if (!bankCode) {
      throw new BadRequestException('Bank code is required');
    }

    const result = await this.monnifyService.validateBankAccount(accountNumber, bankCode);

    return {
      success: true,
      message: 'Account validated',
      data: result,
    };
  }

  // ═══════════════════════════════════════════════
  //  GET WITHDRAWAL ACCOUNT
  // ═══════════════════════════════════════════════

  async getWithdrawalAccount(rider: Rider) {
    return {
      success: true,
      message: 'Withdrawal account retrieved',
      data: {
        bankName: rider.bankName || null,
        bankCode: (rider as any).bankCode || null,
        bankAccountNumber: rider.bankAccountNumber || null,
        bankAccountName: rider.bankAccountName || null,
        isSet: !!(rider.bankName && rider.bankAccountNumber && rider.bankAccountName),
      },
    };
  }

  async getVerificationStatus(rider: Rider) {
    return {
      success: true,
      message: 'Verification status retrieved',
      data: {
        verificationStatus: rider.verificationStatus,
        documentsSubmitted: {
          driversLicense: !!rider.driversLicense,
          nationalId: !!rider.nationalId,
          vehicleRegistration: !!rider.vehicleRegistration,
          vehicleInsurance: !!rider.vehicleInsurance,
        },
      },
    };
  }

  async getRiderStats(rider: Rider) {
    return {
      success: true,
      message: 'Statistics retrieved',
      data: {
        totalDeliveries: rider.totalDeliveries,
        totalEarnings: rider.totalEarnings,
        averageRating: rider.averageRating,
        totalRatings: rider.totalRatings,
      },
    };
  }
}
