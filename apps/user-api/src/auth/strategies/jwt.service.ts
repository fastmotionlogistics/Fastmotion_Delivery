import * as crypto from 'crypto-js';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtTokenService {
  constructor(private readonly jwtService: NestJwtService, private readonly configService: ConfigService) {}

  generateAccessToken(payload: Record<string, unknown>): string {
    const encrypted = crypto.AES.encrypt(JSON.stringify(payload), this.configService.get('JWT_SECRET')).toString();

    return this.jwtService.sign(
      { data: encrypted },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: `${this.configService.get('JWT_EXPIRATION')}` || '1d',
      },
    );
  }

  generateRefreshToken(payload: Record<string, unknown>): string {
    const encrypted = crypto.AES.encrypt(JSON.stringify(payload), this.configService.get('JWT_SECRET')).toString();

    return this.jwtService.sign(
      { data: encrypted },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
      },
    );
  }

  verifyToken(token: string): any {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const decrypted = crypto.AES.decrypt(decoded['data'], this.configService.get('JWT_SECRET')).toString(
        crypto.enc.Utf8,
      );

      return JSON.parse(decrypted);
    } catch (err) {
      if (err['message'].includes('expired')) {
        throw new UnauthorizedException('Token Expired! Please Sign in.');
      }
      if (err.message.includes('invalid')) {
        throw new UnauthorizedException('Invalid Token! Please Sign in.');
      }
      if (err.message.includes('malformed')) {
        throw new UnauthorizedException('Malformed Token! Please Sign in.');
      }
      return { verified: false };
    }
  }

  verifyRefreshToken(token: string): any {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}
