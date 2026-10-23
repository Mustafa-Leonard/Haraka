import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SmsTemplateKey } from '@haraka/database';
import { PrismaService } from '../common/database/prisma.service';
import { SmsAdapter } from './sms.adapter';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsAdapter: SmsAdapter,
    private readonly config: ConfigService,
  ) {}

  get emailConfigured(): boolean {
    return Boolean(
      this.config.get<string>('RESEND_API_KEY') && this.config.get<string>('EMAIL_FROM'),
    );
  }

  async sendAccountEmail(to: string, subject: string, text: string): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('EMAIL_FROM');
    if (!apiKey || !from) {
      throw new ServiceUnavailableException('Email delivery is not configured.');
    }

    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: [to], subject, text }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      this.logger.error(`Account email provider request failed: ${String(error)}`);
      throw new ServiceUnavailableException('Email delivery failed. Please retry later.');
    }

    if (!response.ok) {
      this.logger.error(`Account email provider returned HTTP ${response.status}`);
      throw new ServiceUnavailableException('Email delivery failed. Please retry later.');
    }
  }

  async sendOtp(phone: string, code: string, lang = 'en'): Promise<void> {
    const message =
      lang === 'sw'
        ? `Nambari yako ya siri ya Haraka ni: ${code}. Usishiriki na mtu yeyote. Inaisha baada ya dakika 10.`
        : `Your Haraka verification code is: ${code}. Do not share this code. Valid for 10 minutes.`;

    await this.dispatchSms(phone, message, 'OTP_VERIFICATION');
  }

  async sendBookingConfirmed(
    phone: string,
    ref: string,
    pickupPin: string,
    lang = 'en',
  ): Promise<void> {
    const message =
      lang === 'sw'
        ? `Mzigo wako ${ref} umepokelewa Haraka! Mpatie dereva PIN hii akifika kuchukua: ${pickupPin}.`
        : `Haraka delivery ${ref} confirmed! Provide this PIN to the rider at pickup: ${pickupPin}.`;

    await this.dispatchSms(phone, message, 'BOOKING_CONFIRMED');
  }

  async sendRiderAssigned(
    recipientPhone: string,
    ref: string,
    riderName: string,
    plate: string,
    trackUrl: string,
    lang = 'en',
  ): Promise<void> {
    const message =
      lang === 'sw'
        ? `Dereva ${riderName} (${plate}) amepewa mzigo wako ${ref}. Fuatilia hapa: ${trackUrl}`
        : `Rider ${riderName} (${plate}) is assigned to your delivery ${ref}. Track here: ${trackUrl}`;

    await this.dispatchSms(recipientPhone, message, 'RIDER_ASSIGNED');
  }

  async sendDeliveryPin(
    recipientPhone: string,
    ref: string,
    deliveryPin: string,
    lang = 'en',
  ): Promise<void> {
    const message =
      lang === 'sw'
        ? `Mzigo wako ${ref} unakaribia kufika! PIN yako ya kupokelea ni: ${deliveryPin}. Mpatie dereva pindi akifika.`
        : `Your Haraka delivery ${ref} is arriving soon! Your delivery confirmation PIN is: ${deliveryPin}. Give this to the rider.`;

    await this.dispatchSms(recipientPhone, message, 'DELIVERY_PIN');
  }

  async sendDeliveryCompleted(recipientPhone: string, ref: string, lang = 'en'): Promise<void> {
    const message =
      lang === 'sw'
        ? `Mzigo wako ${ref} umewasilishwa salama. Asante kwa kutumia Haraka!`
        : `Your Haraka delivery ${ref} has been delivered successfully. Thank you for using Haraka!`;

    await this.dispatchSms(recipientPhone, message, 'DELIVERED');
  }

  private async dispatchSms(to: string, body: string, templateKey: SmsTemplateKey): Promise<void> {
    const res = await this.smsAdapter.send(to, body);

    await this.prisma.notification.create({
      data: {
        channel: 'SMS',
        templateKey,
        recipient: to,
        body: ['OTP_VERIFICATION', 'BOOKING_CONFIRMED', 'DELIVERY_PIN'].includes(templateKey)
          ? '[REDACTED]'
          : body,
        status: res.isSandbox ? 'PENDING' : res.success ? 'DELIVERED' : 'FAILED',
        providerRef: res.messageId,
        ...(res.success && !res.isSandbox
          ? { sentAt: new Date() }
          : res.success
            ? {}
            : { failedAt: new Date() }),
      },
    });
    if (!res.success) {
      throw new ServiceUnavailableException('SMS delivery failed. Please retry later.');
    }
  }
}
