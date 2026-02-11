import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rider } from '@libs/database';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'rider-jwt') {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Rider.name) private readonly riderModel: Model<Rider>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const rider = await this.riderModel.findById(payload.rider_id);

    if (!rider) {
      throw new UnauthorizedException('Rider not found');
    }

    if (!rider.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return rider;
  }
}
