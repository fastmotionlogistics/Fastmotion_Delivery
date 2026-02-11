import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'rider-local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'emailOrPhone',
      passwordField: 'password',
    });
  }

  async validate(emailOrPhone: string, password: string): Promise<any> {
    const rider = await this.authService.verifyRider(emailOrPhone, password);

    if (!rider) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return rider;
  }
}
