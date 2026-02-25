import {
  Body,
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginAdminDto,
  ChangePasswordDto,
  CreateAdminDto,
  UpdateAdminDto,
  ResetAdminPasswordDto,
  LogoutAdminDto,
} from './dto';
import { Admin, AdminRoleEnum } from '@libs/database';
import { AdminLocalAuthGuard, AdminJwtAuthGuard, PermissionGuard, RequireRoles } from './guards';
import { CurrentAdmin } from './decorators/current-admin.decorator';

@ApiTags('Admin Auth & Management')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ──────────────── PUBLIC ────────────────

  @ApiOperation({ summary: 'Admin login' })
  @ApiBody({ type: LoginAdminDto })
  @UseGuards(AdminLocalAuthGuard)
  @Post('login')
  async login(
    @CurrentAdmin() admin: Admin,
    @Body() body: LoginAdminDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'];
    return await this.authService.login(admin, body, ip);
  }

  // ──────────────── AUTHENTICATED ─────────

  @ApiOperation({ summary: 'Get current admin profile' })
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  async getMe(@CurrentAdmin() admin: Admin) {
    return await this.authService.getMe(admin);
  }

  @ApiOperation({ summary: 'Change own password' })
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Post('change-password')
  async changePassword(
    @CurrentAdmin() admin: Admin,
    @Body() body: ChangePasswordDto,
  ) {
    return await this.authService.changePassword(admin, body);
  }

  @ApiOperation({ summary: 'Logout' })
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  async logout(
    @CurrentAdmin() admin: Admin,
    @Body() body: LogoutAdminDto,
  ) {
    return await this.authService.logout(admin, body);
  }

  // ──────────────── SUPER ADMIN ONLY ──────

  @ApiOperation({ summary: 'Create new admin account (super_admin only)' })
  @UseGuards(AdminJwtAuthGuard, PermissionGuard)
  @RequireRoles(AdminRoleEnum.SUPER_ADMIN, AdminRoleEnum.ADMIN)
  @ApiBearerAuth()
  @Post('admins')
  async createAdmin(
    @CurrentAdmin() admin: Admin,
    @Body() body: CreateAdminDto,
  ) {
    return await this.authService.createAdmin(admin, body);
  }

  @ApiOperation({ summary: 'List all admin accounts' })
  @UseGuards(AdminJwtAuthGuard, PermissionGuard)
  @RequireRoles(AdminRoleEnum.SUPER_ADMIN, AdminRoleEnum.ADMIN)
  @ApiBearerAuth()
  @Get('admins')
  async getAllAdmins(@CurrentAdmin() admin: Admin) {
    return await this.authService.getAllAdmins(admin);
  }

  @ApiOperation({ summary: 'Get admin by ID' })
  @UseGuards(AdminJwtAuthGuard, PermissionGuard)
  @RequireRoles(AdminRoleEnum.SUPER_ADMIN, AdminRoleEnum.ADMIN)
  @ApiBearerAuth()
  @Get('admins/:id')
  async getAdminById(@Param('id') id: string) {
    return await this.authService.getAdminById(id);
  }

  @ApiOperation({ summary: 'Update admin account' })
  @UseGuards(AdminJwtAuthGuard, PermissionGuard)
  @RequireRoles(AdminRoleEnum.SUPER_ADMIN)
  @ApiBearerAuth()
  @Put('admins/:id')
  async updateAdmin(@Param('id') id: string, @Body() body: UpdateAdminDto) {
    return await this.authService.updateAdmin(id, body);
  }

  @ApiOperation({ summary: 'Reset admin password (super_admin only)' })
  @UseGuards(AdminJwtAuthGuard, PermissionGuard)
  @RequireRoles(AdminRoleEnum.SUPER_ADMIN)
  @ApiBearerAuth()
  @Post('admins/:id/reset-password')
  async resetAdminPassword(
    @Param('id') id: string,
    @Body() body: ResetAdminPasswordDto,
  ) {
    return await this.authService.resetAdminPassword(id, body);
  }

  @ApiOperation({ summary: 'Delete (deactivate) admin account' })
  @UseGuards(AdminJwtAuthGuard, PermissionGuard)
  @RequireRoles(AdminRoleEnum.SUPER_ADMIN)
  @ApiBearerAuth()
  @Delete('admins/:id')
  async deleteAdmin(
    @CurrentAdmin() admin: Admin,
    @Param('id') id: string,
  ) {
    return await this.authService.deleteAdmin(admin, id);
  }
}
