import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ModifyResult, Types } from 'mongoose';
import { Role } from '@libs/common';
import { Wallet } from '@libs/database';

@Injectable()
export class WalletRepository {
  protected readonly logger = new Logger(WalletRepository.name);

  constructor(
    @InjectModel('Wallet')
    private readonly model: Model<Wallet>,
  ) {}

  async create(data: Partial<Wallet>): Promise<Wallet> {
    const created = new this.model({ ...data, _id: new Types.ObjectId() });
    return created.save();
  }

  async findOne(filter: any): Promise<Wallet | null> {
    return this.model.findOne(filter).exec();
  }
  async findAdmin(): Promise<Wallet | null> {
    const result = await this.model
      .aggregate([
        {
          $lookup: {
            from: 'user',
            localField: 'user',
            foreignField: '_id',
            as: 'userData',
          },
        },
        {
          $unwind: '$userData',
        },
        {
          $match: {
            'userData.type': Role.ADMIN,
          },
        },
        {
          $limit: 1,
        },
      ])
      .exec();

    if (result.length === 0) return null;

    // Convert aggregation result to populated document
    const wallet = await this.model.findById(result[0]._id).populate('user').exec();
    return wallet;
  }

  async findById(id: any): Promise<Wallet | null> {
    return this.model.findById(id).exec();
  }

  async findOneAndUpdate(filter: any, update: any, options?: any): Promise<ModifyResult<Wallet> | null> {
    return this.model.findOneAndUpdate(filter, update, { new: true, ...options }).exec();
  }
}
