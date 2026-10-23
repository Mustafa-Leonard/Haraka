import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { randomUUID } from 'crypto';

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  isSandbox: boolean;
  cost?: string;
}

@Injectable()
export class SmsAdapter {
  private readonly logger = new Logger(SmsAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async send(to: string, message: string): Promise<SendSmsResult> {
    const env = this.config.get<string>('AT_ENV', 'sandbox');
    const apiKey = this.config.get<string>('AT_API_KEY');
    const username = this.config.get<string>('AT_USERNAME', 'sandbox');
    const senderId = this.config.get<string>('AT_SENDER_ID', 'Haraka');

    if (env === 'sandbox') {
      this.logger.log('SMS sandbox dispatch requested.');
      return {
        success: true,
        messageId: `sandbox-${randomUUID()}`,
        isSandbox: true,
        cost: 'KES 0.00',
      };
    }
    if (env !== 'production' || !apiKey || apiKey.startsWith('YOUR_')) {
      throw new ServiceUnavailableException('Live SMS integration is not fully configured.');
    }

    // Production Africa's Talking API
    try {
      const url = 'https://api.africastalking.com/version1/messaging';
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('to', to);
      params.append('message', message);
      if (senderId && senderId !== 'Haraka') {
        params.append('from', senderId);
      }

      const res = await axios.post(url, params.toString(), {
        headers: {
          apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      });

      const recipientData = res.data?.SMSMessageData?.Recipients?.[0];
      const status = recipientData?.status;
      const success = status === 'Success';

      return {
        success,
        messageId: recipientData?.messageId,
        isSandbox: false,
        cost: recipientData?.cost,
      };
    } catch {
      this.logger.error('SMS dispatch failed.');
      throw new ServiceUnavailableException('SMS delivery failed. Please retry later.');
    }
  }
}
