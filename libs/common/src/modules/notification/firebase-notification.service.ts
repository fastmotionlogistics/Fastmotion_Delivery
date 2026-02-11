import { Injectable, Logger } from '@nestjs/common';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseNotificationService {
  private readonly logger = new Logger(FirebaseNotificationService.name);

  constructor(@InjectFirebaseAdmin() private readonly firebase: FirebaseAdmin) {}

  /**
   * Send a Firebase push notification to a single device token.
   * @param token Device FCM token
   * @param title Notification title
   * @param body Notification body
   * @param data Optional payload
   */
  async sendFirebase(token: string, title: string, body: string, data?: Record<string, any>): Promise<boolean> {
    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
        },
        data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : undefined,
        // android: {
        //   priority: 'high',
        //   notification: {
        //     channelId: 'default',
        //     priority: 'high',
        //     defaultSound: true,
        //     defaultVibrateTimings: true,
        //   },
        //   ttl: 30000, // 30 seconds
        // },
        // apns: {
        //   payload: {
        //     aps: {
        //       alert: {
        //         title,
        //         body,
        //       },
        //       sound: 'default',
        //       badge: 1,
        //       'content-available': 1,
        //     },
        //   },
        //   headers: {
        //     'apns-priority': '10',
        //     'apns-expiration': (Math.floor(Date.now() / 1000) + 30).toString(),
        //   },
        // },
      };

      await this.firebase.messaging.send(message);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send firebase notification to token ${token}`, error.stack);
      return false;
    }
  }
}
