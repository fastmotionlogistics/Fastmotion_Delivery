import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppContent, AppContentDocument } from '@libs/database';

@ApiTags('App Content')
@Controller('app-content')
export class AppContentController {
  constructor(
    @InjectModel(AppContent.name)
    private readonly appContentModel: Model<AppContentDocument>,
  ) {}

  @ApiOperation({ summary: 'Get app content (terms, policy, FAQ, contact) — public, no auth' })
  @Get()
  async getContent() {
    const content = await this.appContentModel.findOne().lean();
    return {
      success: true,
      data: {
        termsAndConditions: content?.termsAndConditions || '',
        privacyPolicy: content?.privacyPolicy || '',
        contactEmail: content?.contactEmail || '',
        contactPhone: content?.contactPhone || '',
        faqs: content?.faqs || [],
      },
    };
  }
}
