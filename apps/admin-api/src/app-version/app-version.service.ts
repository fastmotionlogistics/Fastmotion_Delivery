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
    const existing = await this.appVersionModel.findOne({ appType: dto.appType });

    if (existing) {
      if (!Array.isArray(existing.versionHistory)) {
        existing.versionHistory = [];
      }
      existing.versionHistory.unshift({
        currentVersion: existing.currentVersion,
        minimumVersion: existing.minimumVersion,
        maintenanceMode: existing.maintenanceMode,
        updateTitle: existing.updateTitle,
        updateMessage: existing.updateMessage,
        releaseNotes: existing.releaseNotes,
        androidStoreUrl: existing.androidStoreUrl,
        iosStoreUrl: existing.iosStoreUrl,
        updatedAt: existing.updatedAt || new Date(),
      });
      existing.markModified('versionHistory');

      existing.currentVersion = dto.currentVersion;
      existing.minimumVersion = dto.minimumVersion;
      existing.maintenanceMode = dto.maintenanceMode ?? false;
      existing.updateTitle = dto.updateTitle || 'Update Available';
      existing.updateMessage = dto.updateMessage || '';
      existing.releaseNotes = dto.releaseNotes || '';
      existing.androidStoreUrl = dto.androidStoreUrl || '';
      existing.iosStoreUrl = dto.iosStoreUrl || '';

      await existing.save();

      return {
        success: true,
        message: `App version for ${dto.appType} updated`,
        data: { version: existing.toObject() },
      };
    }

    const version = await this.appVersionModel.create({
      _id: new Types.ObjectId(),
      appType: dto.appType,
      currentVersion: dto.currentVersion,
      minimumVersion: dto.minimumVersion,
      maintenanceMode: dto.maintenanceMode ?? false,
      updateTitle: dto.updateTitle || 'Update Available',
      updateMessage: dto.updateMessage || '',
      releaseNotes: dto.releaseNotes || '',
      androidStoreUrl: dto.androidStoreUrl || '',
      iosStoreUrl: dto.iosStoreUrl || '',
      versionHistory: [],
    });

    return {
      success: true,
      message: `App version for ${dto.appType} created`,
      data: { version: version.toObject() },
    };
  }

  async getVersions() {
    const versions = await this.appVersionModel.find().lean();
    const normalized = versions.map((v) => ({
      ...v,
      versionHistory: Array.isArray(v.versionHistory) ? v.versionHistory : [],
    }));
    return {
      success: true,
      message: 'App versions retrieved',
      data: { versions: normalized },
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
