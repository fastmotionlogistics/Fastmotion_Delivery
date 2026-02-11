import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { Types } from 'mongoose';
import * as jwt from 'jsonwebtoken';
import { JwtTokenService } from './jwt.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: AuthService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly jwtTokenService: JwtTokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          const token = request?.headers?.authorization?.split(' ')[1];
          if (token) {
            try {
              const decoded: any = this.jwtTokenService.verifyToken(token);

              return this.jwtService.sign(decoded, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: `${this.configService.get('JWT_EXPIRATION')}`,
              });
            } catch (error) {
              return null;
            }
          }
          return null;
        },
      ]),

      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(dd: { user_id: number; email: string }) {
    try {
      const user = await this.usersService.getUser({
        _id: new Types.ObjectId(dd.user_id),
      });

      // console.log('User found in JWT strategy:', user);

      return user;
    } catch (error) {
      console.error('JWT validation error:', error);
      throw new UnauthorizedException(error);
    }
  }
}
