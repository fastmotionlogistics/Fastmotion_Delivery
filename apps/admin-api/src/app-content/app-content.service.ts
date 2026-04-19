import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppContent, AppContentDocument } from '@libs/database';
import { UpdateAppContentDto } from './dto';

@Injectable()
export class AdminAppContentService {
  constructor(
    @InjectModel(AppContent.name)
    private readonly appContentModel: Model<AppContentDocument>,
  ) {}

  async getContent() {
    let content = await this.appContentModel.findOne().lean();
    if (!content) {
      content = await this.appContentModel.create({
        _id: new Types.ObjectId(),
        termsAndConditions: '',
        privacyPolicy: '',
        contactEmail: '',
        contactPhone: '',
        faqs: [],
      });
      content = content.toObject();
    }
    return {
      success: true,
      message: 'App content retrieved',
      data: { content },
    };
  }

  async updateContent(dto: UpdateAppContentDto) {
    const update: Record<string, any> = {};
    if (dto.termsAndConditions !== undefined) update.termsAndConditions = dto.termsAndConditions;
    if (dto.privacyPolicy !== undefined) update.privacyPolicy = dto.privacyPolicy;
    if (dto.contactEmail !== undefined) update.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) update.contactPhone = dto.contactPhone;
    if (dto.faqs !== undefined) update.faqs = dto.faqs;

    const content = await this.appContentModel.findOneAndUpdate(
      {},
      { $set: update, $setOnInsert: { _id: new Types.ObjectId() } },
      { upsert: true, new: true },
    ).lean();

    return {
      success: true,
      message: 'App content updated',
      data: { content },
    };
  }
}
