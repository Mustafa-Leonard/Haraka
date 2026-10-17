import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { SmsAdapter } from './sms.adapter';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsAdapter: SmsAdapter,
  ) {}

  async sendOtp(phone: string, code: string, lang = 'en'): Promise<void> {
    const message =
      lang === 'sw'
        ? `Nambari yako ya siri ya Haraka ni: ${code}. Usishiriki na mtu yeyote. Inaisha baada ya dakika 10.`
        : `Your Haraka verification code is: ${code}. Do not share this code. Valid for 10 minutes.`;

    await this.dispatchSms(phone, message, 'OTP_VERIFICATION');
  }

  async sendBookingConfirmed(phone: string, ref: string, pickupPin: string, lang = 'en'): Promise<void> {
    const message =
      lang === 'sw'
        ? `Mzigo wako ${ref} umepokelewa Haraka! Mpatie dereva PIN hii akifika kuchukua: ${pickupPin}.`
        : `Haraka delivery ${ref} confirmed! Provide this PIN to the rider at pickup: ${pickupPin}.`;

    await this.dispatchSms(phone, message, 'BOOKING_CONFIRMED');
  }

  async sendRiderAssigned(recipientPhone: string, ref: string, riderName: string, plate: string, trackUrl: string, lang = 'en'): Promise<void> {
    const message =
      lang === 'sw'
        ? `Dereva ${riderName} (${plate}) amepewa mzigo wako ${ref}. Fuatilia hapa: ${trackUrl}`
        : `Rider ${riderName} (${plate}) is assigned to your delivery ${ref}. Track here: ${trackUrl}`;

    await this.dispatchSms(recipientPhone, message, 'RIDER_ASSIGNED');
  }

  async sendDeliveryPin(recipientPhone: string, ref: string, deliveryPin: string, lang = 'en'): Promise<void> {
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

  private async dispatchSms(to: string, body: string, templateKey: string): Promise<void> {
    const res = await this.smsAdapter.send(to, body);

    try {
      await this.prisma.notification.create({
        data: {
          channel: 'SMS',
          templateKey: templateKey as any,
          recipient: to,
          body,
          status: res.success ? 'DELIVERED' : 'FAILED',
          providerRef: res.messageId,
          sentAt: new Date(),
        },
      });
    } catch {
      // In development fallback if DB table not seeded yet
    }
  }
}
