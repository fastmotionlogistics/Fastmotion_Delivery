import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import {
  CreateItemCategoryDto,
  UpdateItemCategoryDto,
  CreateSpecialHandlingDto,
  UpdateSpecialHandlingDto,
} from './dto';
import { AdminPermissionEnum } from '@libs/database';
import {
  AdminJwtAuthGuard,
  PermissionGuard,
  RequirePermissions,
} from '../auth/guards';

@ApiTags('Admin - Catalog (Categories & Handling)')
@Controller('catalog')
@UseGuards(AdminJwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // ============ Item Categories ============

  @ApiOperation({ summary: 'Get all item categories' })
  @RequirePermissions(AdminPermissionEnum.PRICING_VIEW)
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @Get('categories')
  async getAllCategories(@Query('status') status?: string) {
    return await this.catalogService.getAllCategories(status);
  }

  @ApiOperation({ summary: 'Get category by ID' })
  @RequirePermissions(AdminPermissionEnum.PRICING_VIEW)
  @Get('categories/:id')
  async getCategoryById(@Param('id') id: string) {
    return await this.catalogService.getCategoryById(id);
  }

  @ApiOperation({ summary: 'Create item category' })
  @RequirePermissions(AdminPermissionEnum.PRICING_MANAGE)
  @ApiBody({ type: CreateItemCategoryDto })
  @Post('categories')
  async createCategory(@Body() body: CreateItemCategoryDto) {
    return await this.catalogService.createCategory(body);
  }

  @ApiOperation({ summary: 'Update item category' })
  @RequirePermissions(AdminPermissionEnum.PRICING_MANAGE)
  @ApiBody({ type: UpdateItemCategoryDto })
  @Put('categories/:id')
  async updateCategory(@Param('id') id: string, @Body() body: UpdateItemCategoryDto) {
    return await this.catalogService.updateCategory(id, body);
  }

  @ApiOperation({ summary: 'Delete (deactivate) item category' })
  @RequirePermissions(AdminPermissionEnum.PRICING_MANAGE)
  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return await this.catalogService.deleteCategory(id);
  }

  // ============ Special Handling ============

  @ApiOperation({ summary: 'Get all special handling options' })
  @RequirePermissions(AdminPermissionEnum.PRICING_VIEW)
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @Get('handling')
  async getAllHandling(@Query('status') status?: string) {
    return await this.catalogService.getAllHandling(status);
  }

  @ApiOperation({ summary: 'Get special handling by ID' })
  @RequirePermissions(AdminPermissionEnum.PRICING_VIEW)
  @Get('handling/:id')
  async getHandlingById(@Param('id') id: string) {
    return await this.catalogService.getHandlingById(id);
  }

  @ApiOperation({ summary: 'Create special handling option' })
  @RequirePermissions(AdminPermissionEnum.PRICING_MANAGE)
  @ApiBody({ type: CreateSpecialHandlingDto })
  @Post('handling')
  async createHandling(@Body() body: CreateSpecialHandlingDto) {
    return await this.catalogService.createHandling(body);
  }

  @ApiOperation({ summary: 'Update special handling option' })
  @RequirePermissions(AdminPermissionEnum.PRICING_MANAGE)
  @ApiBody({ type: UpdateSpecialHandlingDto })
  @Put('handling/:id')
  async updateHandling(@Param('id') id: string, @Body() body: UpdateSpecialHandlingDto) {
    return await this.catalogService.updateHandling(id, body);
  }

  @ApiOperation({ summary: 'Delete (deactivate) special handling option' })
  @RequirePermissions(AdminPermissionEnum.PRICING_MANAGE)
  @Delete('handling/:id')
  async deleteHandling(@Param('id') id: string) {
    return await this.catalogService.deleteHandling(id);
  }
}
