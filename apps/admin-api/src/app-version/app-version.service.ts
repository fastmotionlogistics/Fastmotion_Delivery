import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppVersion, AppVersionDocument } from '@libs/database';
import { UpsertAppVersionDto } from './dto';

@Injectable()
export class AdminAppVersionService {
  constructor(
    @InjectModel(AppVersion.name)
    private readonly appVersionModel: Model<AppVersionDocument>,
  ) {}

  async upsertVersion(dto: UpsertAppVersionDto) {
    const version = await this.appVersionModel.findOneAndUpdate(
      { appType: dto.appType },
      {
        $set: {
          currentVersion: dto.currentVersion,
          minimumVersion: dto.minimumVersion,
          maintenanceMode: dto.maintenanceMode ?? false,
          updateTitle: dto.updateTitle || 'Update Available',
          updateMessage: dto.updateMessage || '',
          releaseNotes: dto.releaseNotes || '',
          androidStoreUrl: dto.androidStoreUrl || '',
          iosStoreUrl: dto.iosStoreUrl || '',
        },
        $setOnInsert: { _id: new Types.ObjectId() },
      },
      { upsert: true, new: true },
    ).lean();

    return {
      success: true,
      message: `App version for ${dto.appType} updated`,
      data: { version },
    };
  }

  async getVersions() {
    const versions = await this.appVersionModel.find().lean();
    return {
      success: true,
      message: 'App versions retrieved',
      data: { versions },
    };
  }

  async getVersionByType(appType: string) {
    const version = await this.appVersionModel.findOne({ appType }).lean();
    if (!version) throw new NotFoundException(`No version config found for ${appType}`);
    return {
      success: true,
      message: `Version config for ${appType}`,
      data: { version },
    };
  }
}
