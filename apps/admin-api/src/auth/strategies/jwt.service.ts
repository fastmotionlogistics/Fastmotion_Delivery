import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminJwtTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(payload: Record<string, any>): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow('JWT_ASECRET'),
      expiresIn: this.configService.getOrThrow('JWT_EXPIRATION'),
    });
  }

  verifyToken(token: string): any {
    return this.jwtService.verify(token, {
      secret: this.configService.getOrThrow('JWT_ASECRET'),
    });
  }
}
