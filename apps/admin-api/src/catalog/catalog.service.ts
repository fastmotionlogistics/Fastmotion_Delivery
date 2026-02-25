import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ItemCategory,
  ItemCategoryDocument,
  ItemCategoryStatusEnum,
  SpecialHandling,
  SpecialHandlingDocument,
  SpecialHandlingStatusEnum,
} from '@libs/database';
import {
  CreateItemCategoryDto,
  UpdateItemCategoryDto,
  CreateSpecialHandlingDto,
  UpdateSpecialHandlingDto,
} from './dto';

@Injectable()
export class CatalogService {
  constructor(
    @InjectModel(ItemCategory.name)
    private readonly categoryModel: Model<ItemCategoryDocument>,
    @InjectModel(SpecialHandling.name)
    private readonly handlingModel: Model<SpecialHandlingDocument>,
  ) {}

  // ═══════════ ITEM CATEGORIES ═══════════

  async getAllCategories(status?: string) {
    const query: any = {};
    if (status) query.status = status;
    const data = await this.categoryModel.find(query).sort({ sortOrder: 1 }).lean();
    return { success: true, message: 'Categories retrieved', data };
  }

  async getCategoryById(id: string) {
    const cat = await this.categoryModel.findById(id).lean();
    if (!cat) throw new NotFoundException('Category not found');
    return { success: true, data: cat };
  }

  async createCategory(body: CreateItemCategoryDto) {
    const existing = await this.categoryModel.findOne({ slug: body.slug });
    if (existing) throw new ConflictException(`Category "${body.slug}" already exists`);

    const cat = await this.categoryModel.create({
      _id: new Types.ObjectId(),
      ...body,
      status: ItemCategoryStatusEnum.ACTIVE,
    });
    return { success: true, message: 'Category created', data: cat };
  }

  async updateCategory(id: string, body: UpdateItemCategoryDto) {
    const cat = await this.categoryModel.findById(id);
    if (!cat) throw new NotFoundException('Category not found');

    if (body.slug && body.slug !== cat.slug) {
      const dup = await this.categoryModel.findOne({ slug: body.slug, _id: { $ne: id } });
      if (dup) throw new ConflictException(`Category slug "${body.slug}" already exists`);
    }

    await this.categoryModel.updateOne({ _id: id }, { $set: body });
    const updated = await this.categoryModel.findById(id).lean();
    return { success: true, message: 'Category updated', data: updated };
  }

  async deleteCategory(id: string) {
    const cat = await this.categoryModel.findById(id);
    if (!cat) throw new NotFoundException('Category not found');
    await this.categoryModel.updateOne({ _id: id }, { $set: { status: ItemCategoryStatusEnum.INACTIVE } });
    return { success: true, message: 'Category deactivated' };
  }

  // ═══════════ SPECIAL HANDLING ═══════════

  async getAllHandling(status?: string) {
    const query: any = {};
    if (status) query.status = status;
    const data = await this.handlingModel.find(query).sort({ sortOrder: 1 }).lean();
    return { success: true, message: 'Special handling options retrieved', data };
  }

  async getHandlingById(id: string) {
    const sh = await this.handlingModel.findById(id).lean();
    if (!sh) throw new NotFoundException('Special handling not found');
    return { success: true, data: sh };
  }

  async createHandling(body: CreateSpecialHandlingDto) {
    const existing = await this.handlingModel.findOne({ slug: body.slug });
    if (existing) throw new ConflictException(`Special handling "${body.slug}" already exists`);

    const sh = await this.handlingModel.create({
      _id: new Types.ObjectId(),
      ...body,
      status: SpecialHandlingStatusEnum.ACTIVE,
    });
    return { success: true, message: 'Special handling created', data: sh };
  }

  async updateHandling(id: string, body: UpdateSpecialHandlingDto) {
    const sh = await this.handlingModel.findById(id);
    if (!sh) throw new NotFoundException('Special handling not found');

    if (body.slug && body.slug !== sh.slug) {
      const dup = await this.handlingModel.findOne({ slug: body.slug, _id: { $ne: id } });
      if (dup) throw new ConflictException(`Special handling slug "${body.slug}" already exists`);
    }

    await this.handlingModel.updateOne({ _id: id }, { $set: body });
    const updated = await this.handlingModel.findById(id).lean();
    return { success: true, message: 'Special handling updated', data: updated };
  }

  async deleteHandling(id: string) {
    const sh = await this.handlingModel.findById(id);
    if (!sh) throw new NotFoundException('Special handling not found');
    await this.handlingModel.updateOne({ _id: id }, { $set: { status: SpecialHandlingStatusEnum.INACTIVE } });
    return { success: true, message: 'Special handling deactivated' };
  }
}
