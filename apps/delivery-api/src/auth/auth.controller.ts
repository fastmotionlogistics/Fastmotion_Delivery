import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  LoginRiderDto,
  VerifyBikeDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  LogoutDto,
} from './dto';
import { Rider } from '@libs/database';
import { RiderLocalAuthGuard, RiderJwtAuthGuard } from './guards';
import { CurrentRider } from './decorators/current-rider.decorator';

@ApiTags('Rider Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // NOTE: No registration endpoint — riders are created by admin only

  @ApiOperation({ summary: 'Login rider (email or phone + password)' })
  @ApiBody({ type: LoginRiderDto })
  @UseGuards(RiderLocalAuthGuard)
  @Post('login')
  async login(@CurrentRider() rider: Rider, @Body() body: LoginRiderDto) {
    return await this.authService.login(rider, body);
  }

  @ApiOperation({ summary: 'Verify & bind bike ID (post-login security step)' })
  @ApiBody({ type: VerifyBikeDto })
  @UseGuards(RiderJwtAuthGuard)
  @ApiBearerAuth()
  @Post('verify-bike')
  async verifyBike(@CurrentRider() rider: Rider, @Body() body: VerifyBikeDto) {
    return await this.authService.verifyBike(rider, body);
  }

  @ApiOperation({ summary: 'Forgot password — send OTP' })
  @ApiBody({ type: ForgotPasswordDto })
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return await this.authService.forgotPassword(body);
  }

  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiBody({ type: ResetPasswordDto })
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return await this.authService.resetPassword(body);
  }

  @ApiOperation({ summary: 'Logout rider' })
  @UseGuards(RiderJwtAuthGuard)
  @ApiBearerAuth()
  @ApiBody({ type: LogoutDto, required: false })
  @Post('logout')
  async logout(@CurrentRider() rider: Rider, @Body() body?: LogoutDto) {
    return await this.authService.logout(rider, body);
  }
}
