import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Ip,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  ForgotPasswordDto,
  GoogleSignDto,
  LoginDto,
  RegisterUserDto,
  ResetPasswordDto,
  VerifyOtpDto,
  RegisterShopUserDto,
  VerifyPhoneOtpDto,
  ResendOtpDto,
  VerifyEmailOtpDto,
  ResendEmailOtpDto,
  LogoutDto,
} from './dto';
import { User } from '@libs/database';
import { CurrentUser, LocalAuthGuard, JwtAuthGuard } from '@libs/auth';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiBody({ type: RegisterShopUserDto })
  @Post('register')
  async register(@Body() body: RegisterShopUserDto) {
    return await this.authService.registerUser(body);
  }

  @ApiBody({ type: LoginDto })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@CurrentUser() user: User, @Body() body: LoginDto): Promise<any> {
    return await this.authService.login(user, body);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('googleSignIn')
  async googleSignIn(@Body() body: GoogleSignDto) {
    return await this.authService.googleSignIn(body.accessToken);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('googleSignUp')
  async googleSignUp(@Body() body: GoogleSignDto) {
    return await this.authService.googleSignUp(body.accessToken);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('forgotPassword')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return await this.authService.forgotPassword(body.email);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('resetPassword')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return await this.authService.resetPassword(body);
  }

  @ApiOperation({ summary: 'Verify email with OTP' })
  @ApiBody({ type: VerifyEmailOtpDto })
  @Post('verify-email')
  async verifyEmail(@Body() body: VerifyEmailOtpDto, @Ip() ipAddress: string) {
    return await this.authService.verifyEmailOtp(body, ipAddress);
  }
  // @ApiOperation({ summary: 'Verify phone number with OTP' })
  // @ApiBody({ type: VerifyPhoneOtpDto })
  // @Post('shop/verify-phone')
  // async verifyPhoneOtp(@Body() body: VerifyPhoneOtpDto, @Ip() ipAddress: string) {
  //   return await this.authService.verifyPhoneOtp(body, ipAddress);
  // }

  @ApiOperation({ summary: 'Resend OTP to phone number' })
  @ApiBody({ type: ResendOtpDto })
  @Post('resend-otp')
  async resendPhoneOtp(@Body() body: ResendOtpDto) {
    return await this.authService.resendPhoneOtp(body);
  }
  @ApiOperation({ summary: 'Resend OTP to phone number' })
  @ApiBody({ type: ResendEmailOtpDto })
  @Post('resend-email-otp')
  async resendEmailOtp(@Body() body: ResendEmailOtpDto) {
    return await this.authService.resendEmailOtp(body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user and disable mobile notifications' })
  @ApiBody({ type: LogoutDto, required: false })
  @Post('logout')
  async logout(@CurrentUser() user: User, @Body() body?: LogoutDto) {
    return await this.authService.logout(user, body);
  }

  // @Get('countries')
  // async getCountries() {
  //   return await this.authService.getCountries();
  // }
}
