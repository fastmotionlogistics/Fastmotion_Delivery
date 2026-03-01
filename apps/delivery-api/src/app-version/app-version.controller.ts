import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppVersion, AppVersionDocument } from '@libs/database';

@ApiTags('App Version')
@Controller('app-version')
export class AppVersionController {
  constructor(
    @InjectModel(AppVersion.name)
    private readonly appVersionModel: Model<AppVersionDocument>,
  ) {}

  @ApiOperation({ summary: 'Check for app updates (public, no auth)' })
  @ApiQuery({ name: 'appType', enum: ['user', 'rider'], required: true })
  @ApiQuery({ name: 'currentVersion', required: true, example: '1.0.0' })
  @Get('check')
  async checkVersion(
    @Query('appType') appType: string,
    @Query('currentVersion') currentVersion: string,
  ) {
    const config = await this.appVersionModel.findOne({ appType }).lean();

    if (!config) {
      return {
        success: true,
        data: {
          updateAvailable: false,
          forceUpdate: false,
          maintenanceMode: false,
        },
      };
    }

    const current = this.parseVersion(currentVersion);
    const latest = this.parseVersion(config.currentVersion);
    const minimum = this.parseVersion(config.minimumVersion);

    const updateAvailable = this.isLessThan(current, latest);
    const forceUpdate = this.isLessThan(current, minimum);

    return {
      success: true,
      data: {
        updateAvailable,
        forceUpdate,
        maintenanceMode: config.maintenanceMode || false,
        currentVersion: config.currentVersion,
        minimumVersion: config.minimumVersion,
        updateTitle: config.updateTitle || 'Update Available',
        updateMessage: config.updateMessage || '',
        releaseNotes: config.releaseNotes || '',
        androidStoreUrl: config.androidStoreUrl || '',
        iosStoreUrl: config.iosStoreUrl || '',
      },
    };
  }

  private parseVersion(v: string): number[] {
    return (v || '0.0.0').split('.').map(Number);
  }

  private isLessThan(a: number[], b: number[]): boolean {
    for (let i = 0; i < 3; i++) {
      if ((a[i] || 0) < (b[i] || 0)) return true;
      if ((a[i] || 0) > (b[i] || 0)) return false;
    }
    return false;
  }
}
