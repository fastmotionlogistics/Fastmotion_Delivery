import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin } from '@libs/database';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Admin.name) private readonly adminModel: Model<Admin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('JWT_ASECRET'),
    });
  }

  async validate(payload: any) {
    const admin = await this.adminModel.findById(payload.admin_id);

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if account is locked
    if (admin.lockedUntil && new Date(admin.lockedUntil) > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked. Try again later.');
    }

    return admin;
  }
}
