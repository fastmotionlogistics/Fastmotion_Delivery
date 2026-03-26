import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private readonly brevoApiKey: string;
  private readonly brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';
  private readonly senderEmail = 'godson0477@gmail.com';
  private readonly senderName = 'FastMotion';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.brevoApiKey = this.configService.get<string>('BREVO_API_KEY') || '';

    if (!this.brevoApiKey) {
      this.logger.warn('BREVO_API_KEY not configured. Email notifications will not work.');
    } else {
      this.logger.log('Brevo email service initialized');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.brevoApiKey) {
        this.logger.error('Brevo API key not configured');
        return false;
      }

      const toRecipients = Array.isArray(options.to)
        ? options.to.map((email) => ({ email }))
        : [{ email: options.to }];

      const payload: any = {
        sender: { email: this.senderEmail, name: this.senderName },
        to: toRecipients,
        subject: options.subject,
      };

      if (options.html) {
        payload.htmlContent = options.html;
      } else if (options.text) {
        const escaped = options.text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
        payload.htmlContent = `<html><body><pre style="font-family:Arial,sans-serif;white-space:pre-wrap;">${escaped}</pre></body></html>`;
      }

      const response = await firstValueFrom(
        this.httpService.post(this.brevoApiUrl, payload, {
          headers: {
            'api-key': this.brevoApiKey,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`Email sent. Message ID: ${response.data?.messageId || 'N/A'}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      if (error.response) {
        this.logger.error(`Brevo error: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  }
}
