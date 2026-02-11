import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '@libs/database';

@Injectable()
export class AuthUserRepository {
  protected readonly logger = new Logger(AuthUserRepository.name);

  constructor(
    @InjectModel('User')
    readonly model: Model<User>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const created = new this.model({ ...data, _id: new Types.ObjectId() });
    return created.save();
  }

  async findOne(filter: any, populate: string[] = []): Promise<User | null> {
    return this.model.findOne(filter).populate(populate).lean<User>(true);
  }

  async findById(id: any, populate: string[] = []): Promise<User | null> {
    return this.model.findById(id).populate(populate).lean();
  }

  async findOneAndUpdate(filter: any, update: any, populate: string[] = []): Promise<User | null> {
    return this.model.findOneAndUpdate(filter, update, { new: true, populate: [] }).exec();
  }
}
