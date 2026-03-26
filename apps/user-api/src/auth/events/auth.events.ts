export const AUTH_EVENTS = {
  USER_REGISTERED: 'auth.user_registered',
  USER_WELCOME: 'auth.user_welcome',
  EMAIL_VERIFICATION_REQUESTED: 'auth.email_verification_requested',
  PASSWORD_RESET_REQUESTED: 'auth.password_reset_requested',
} as const;

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  fullName: string;
  otpCode: string;
}

export interface UserWelcomePayload {
  userId: string;
  email: string;
  fullName: string;
}

export interface EmailVerificationPayload {
  userId: string;
  email: string;
  fullName: string;
  otpCode: string;
}

export interface PasswordResetPayload {
  userId: string;
  email: string;
  fullName: string;
  otpCode: string;
}
