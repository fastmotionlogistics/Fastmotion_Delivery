import {
  Body,
  Controller,
  Post,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  RegisterRiderDto,
  LoginRiderDto,
  VerifyOtpDto,
  ResendOtpDto,
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

  @ApiOperation({ summary: 'Register a new rider' })
  @ApiBody({ type: RegisterRiderDto })
  @Post('register')
  async register(@Body() body: RegisterRiderDto) {
    return await this.authService.register(body);
  }

  @ApiOperation({ summary: 'Login rider' })
  @ApiBody({ type: LoginRiderDto })
  @UseGuards(RiderLocalAuthGuard)
  @Post('login')
  async login(@CurrentRider() rider: Rider, @Body() body: LoginRiderDto): Promise<any> {
    return await this.authService.login(rider, body);
  }

  @ApiOperation({ summary: 'Verify email OTP' })
  @ApiBody({ type: VerifyOtpDto })
  @Post('verify-otp')
  async verifyOtp(@Body() body: VerifyOtpDto, @Ip() ipAddress: string) {
    return await this.authService.verifyOtp(body, ipAddress);
  }

  @ApiOperation({ summary: 'Resend OTP' })
  @ApiBody({ type: ResendOtpDto })
  @Post('resend-otp')
  async resendOtp(@Body() body: ResendOtpDto) {
    return await this.authService.resendOtp(body);
  }

  @ApiOperation({ summary: 'Forgot password' })
  @ApiBody({ type: ForgotPasswordDto })
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return await this.authService.forgotPassword(body);
  }

  @ApiOperation({ summary: 'Reset password' })
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
