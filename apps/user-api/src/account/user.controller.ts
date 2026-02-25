import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AccountService } from './user.service';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { User } from '@libs/database';
import { CurrentUser, JwtAuthGuard, SetRolesMetaData } from '@libs/auth';
import { FileUploadOptions, Role, updateFCMDto, UploadFileService } from '@libs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateProfileDto, UpdateNotificationPreferencesDto, CreateSavedAddressDto } from './dto';

@ApiTags('Account')
@Controller('account')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly uploadFileService: UploadFileService,
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @SetRolesMetaData(Role.NORMAL_USER)
  @ApiOperation({ summary: 'Get current user profile' })
  @Get('me')
  async getProfile(@CurrentUser() user: User) {
    return await this.accountService.getProfile(user._id.toString());
  }

  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @SetRolesMetaData(Role.NORMAL_USER)
  @Put('me')
  async updateProfile(@CurrentUser() user: User, @Body() body: UpdateProfileDto) {
    return await this.accountService.updateProfile(user._id.toString(), body);
  }

  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiBody({ type: UpdateNotificationPreferencesDto })
  @Put('notifications')
  async updateNotificationPreferences(
    @CurrentUser() user: User,
    @Body() body: UpdateNotificationPreferencesDto,
  ) {
    return await this.accountService.updateNotificationPreferences(user._id.toString(), body);
  }

  @Put('fcmToken')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update fcm token' })
  @SetRolesMetaData(Role.NORMAL_USER)
  async fcmToken(@CurrentUser() user: User, @Body() updateProfileDto: updateFCMDto) {
    return await this.accountService.updateFCMToken(user._id.toString(), updateProfileDto);
  }

  @Post('upload')
  @SetRolesMetaData(Role.NORMAL_USER)
  @ApiOperation({ summary: 'Upload a single file (profile photo, etc.)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const options: FileUploadOptions = {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxSize: 5 * 1024 * 1024, // 5MB
    };

    return this.uploadFileService.uploadFileCloudinary(
      file.buffer,
      file.originalname,
      file.mimetype,
      options,
    );
  }

  // ═══════════ SAVED ADDRESSES ═══════════

  @ApiOperation({ summary: 'Get saved addresses' })
  @Get('addresses')
  async getSavedAddresses(@CurrentUser() user: User) {
    return await this.accountService.getSavedAddresses(user._id.toString());
  }

  @ApiOperation({ summary: 'Add a saved address (max 5)' })
  @ApiBody({ type: CreateSavedAddressDto })
  @Post('addresses')
  async createSavedAddress(@CurrentUser() user: User, @Body() body: CreateSavedAddressDto) {
    return await this.accountService.createSavedAddress(user._id.toString(), body);
  }

  @ApiOperation({ summary: 'Delete a saved address' })
  @Delete('addresses/:id')
  async deleteSavedAddress(@CurrentUser() user: User, @Param('id') id: string) {
    return await this.accountService.deleteSavedAddress(user._id.toString(), id);
  }

  @ApiOperation({ summary: 'Delete user account' })
  @Post('delete')
  async deleteAccount(@CurrentUser() user: User) {
    return await this.accountService.deleteAccount(user._id.toString());
  }
}
