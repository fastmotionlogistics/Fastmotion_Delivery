import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  async sendEmail(to: string, subject: string, body: string, data?: Record<string, any>): Promise<void> {
    // TODO: integrate real email provider (e.g., SES, SendGrid)
    this.logger.log(`Email -> to: ${to}, subject: ${subject}, body: ${body}, data: ${JSON.stringify(data)}`);
  }
}
