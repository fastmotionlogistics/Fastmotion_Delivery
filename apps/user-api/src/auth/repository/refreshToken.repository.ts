import { RefreshToken } from '@libs/database';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

@Injectable()
export class RefreshTokenRepository {
  protected readonly logger = new Logger(RefreshTokenRepository?.name);

  constructor(
    @InjectModel('RefreshToken')
    private readonly model: Model<RefreshToken>,
  ) {}

  async create(data: Partial<RefreshToken>): Promise<RefreshToken> {
    const created = new this.model({ ...data, _id: new Types.ObjectId() });
    return created.save();
  }

  async findOne(filter: any): Promise<RefreshToken | null> {
    return this.model.findOne(filter).exec();
  }

  async findOneAndDelete(filter: any): Promise<RefreshToken | null> {
    return this.model.findOneAndDelete(filter).exec();
  }

  async findOneAndUpdate(filter: any, update: any): Promise<RefreshToken | null> {
    return this.model.findOneAndUpdate(filter, update, { new: true }).exec();
  }

  async revokeToken(token: string): Promise<RefreshToken | null> {
    return this.model.findOneAndUpdate({ token }, { revoked: true, isActive: false }, { new: true }).exec();
  }

  async revokeAllUserTokens(userId: Types.ObjectId | string): Promise<void> {
    const userIdObj = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    await this.model.updateMany({ user: userIdObj, revoked: false }, { revoked: true, isActive: false }).exec();
  }
}
