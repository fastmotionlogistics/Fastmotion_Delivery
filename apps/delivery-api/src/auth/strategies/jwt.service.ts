import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(payload: Record<string, any>): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow('JWT_SECRET'),
      expiresIn: this.configService.getOrThrow('JWT_EXPIRATION'),
    });
  }

  generateRefreshToken(payload: Record<string, any>): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.getOrThrow('JWT_REFRESH_EXPIRATION'),
    });
  }

  verifyToken(token: string): any {
    return this.jwtService.verify(token, {
      secret: this.configService.getOrThrow('JWT_SECRET'),
    });
  }

  verifyRefreshToken(token: string): any {
    return this.jwtService.verify(token, {
      secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
    });
  }
}
