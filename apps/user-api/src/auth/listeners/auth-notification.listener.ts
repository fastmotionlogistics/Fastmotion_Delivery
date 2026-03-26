import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailNotificationService } from '@libs/common';
import {
  AUTH_EVENTS,
  UserRegisteredPayload,
  UserWelcomePayload,
  EmailVerificationPayload,
  PasswordResetPayload,
} from '../events/auth.events';

@Injectable()
export class AuthNotificationListener {
  private readonly logger = new Logger(AuthNotificationListener.name);

  constructor(private readonly emailService: EmailNotificationService) {}

  @OnEvent(AUTH_EVENTS.USER_REGISTERED, { async: true })
  async handleUserRegistered(payload: UserRegisteredPayload) {
    try {
      const { email, fullName, otpCode } = payload;

      await this.emailService.sendEmail({
        to: email,
        subject: 'Welcome to FastMotion — Verify your email',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
            <h2 style="color:#1f2937;">Welcome, ${fullName}! 🎉</h2>
            <p style="color:#6b7280;">Thanks for signing up for FastMotion. Use the code below to verify your email address.</p>
            <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
              <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111827;">${otpCode}</span>
            </div>
            <p style="color:#9ca3af;font-size:13px;">This code expires in 10 minutes. If you didn't create an account, you can safely ignore this email.</p>
          </div>
        `,
      });

      this.logger.log(`Registration verification email sent to ${email} [user: ${payload.userId}]`);
    } catch (error) {
      this.logger.error(`Failed to send registration email to ${payload.email}`, error.stack);
    }
  }

  @OnEvent(AUTH_EVENTS.USER_WELCOME, { async: true })
  async handleUserWelcome(payload: UserWelcomePayload) {
    try {
      const { email, fullName } = payload;

      await this.emailService.sendEmail({
        to: email,
        subject: 'Welcome to FastMotion!',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
            <h2 style="color:#1f2937;">Welcome, ${fullName}! 🎉</h2>
            <p style="color:#6b7280;">Your FastMotion account is ready. Start sending and tracking packages with ease.</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="#" style="background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Open FastMotion</a>
            </div>
            <p style="color:#9ca3af;font-size:13px;">If you didn't create this account, please contact support immediately.</p>
          </div>
        `,
      });

      this.logger.log(`Welcome email sent to ${email} [user: ${payload.userId}]`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${payload.email}`, error.stack);
    }
  }

  @OnEvent(AUTH_EVENTS.EMAIL_VERIFICATION_REQUESTED, { async: true })
  async handleEmailVerificationRequested(payload: EmailVerificationPayload) {
    try {
      const { email, fullName, otpCode } = payload;

      await this.emailService.sendEmail({
        to: email,
        subject: 'FastMotion — Your verification code',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
            <h2 style="color:#1f2937;">Verify your email</h2>
            <p style="color:#6b7280;">Hi ${fullName}, here is your FastMotion verification code:</p>
            <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
              <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111827;">${otpCode}</span>
            </div>
            <p style="color:#9ca3af;font-size:13px;">This code expires in 10 minutes. If you did not request this, please ignore.</p>
          </div>
        `,
      });

      this.logger.log(`Verification email sent to ${email} [user: ${payload.userId}]`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${payload.email}`, error.stack);
    }
  }

  @OnEvent(AUTH_EVENTS.PASSWORD_RESET_REQUESTED, { async: true })
  async handlePasswordResetRequested(payload: PasswordResetPayload) {
    try {
      const { email, fullName, otpCode } = payload;

      await this.emailService.sendEmail({
        to: email,
        subject: 'FastMotion — Password reset code',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
            <h2 style="color:#1f2937;">Reset your password</h2>
            <p style="color:#6b7280;">Hi ${fullName}, use the code below to reset your FastMotion password.</p>
            <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
              <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111827;">${otpCode}</span>
            </div>
            <p style="color:#9ca3af;font-size:13px;">This code expires in 10 minutes. If you did not request a password reset, you can safely ignore this email.</p>
          </div>
        `,
      });

      this.logger.log(`Password reset email sent to ${email} [user: ${payload.userId}]`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${payload.email}`, error.stack);
    }
  }
}
