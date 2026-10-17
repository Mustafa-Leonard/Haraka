import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface StkPushParams {
  phoneNumber: string; // 2547XXXXXXXX
  amount: number;      // major KES units (e.g. 150)
  accountReference: string;
  transactionDesc: string;
}

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
  isSandbox: boolean;
}

@Injectable()
export class DarajaAdapter {
  private readonly logger = new Logger(DarajaAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async initiateStkPush(params: StkPushParams): Promise<StkPushResult> {
    const env = this.config.get<string>('MPESA_ENV', 'sandbox');
    const consumerKey = this.config.get<string>('MPESA_CONSUMER_KEY');
    const consumerSecret = this.config.get<string>('MPESA_CONSUMER_SECRET');
    const shortcode = this.config.get<string>('MPESA_SHORTCODE', '174379');
    const passkey = this.config.get<string>('MPESA_PASSKEY');
    const callbackUrl = this.config.get<string>(
      'MPESA_CALLBACK_URL',
      'https://haraka.co.ke/api/v1/payments/mpesa/callback',
    );

    // Sandbox simulation mode when credentials not configured
    if (
      env === 'sandbox' ||
      !consumerKey ||
      consumerKey.startsWith('YOUR_') ||
      !consumerSecret
    ) {
      const mockCheckoutId = `ws_CO_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const mockMerchantId = `MR_${Date.now()}`;
      this.logger.log(
        `[M-PESA SANDBOX] STK Push initiated: ${params.phoneNumber} | KES ${params.amount} | Ref: ${params.accountReference}`,
      );

      return {
        merchantRequestId: mockMerchantId,
        checkoutRequestId: mockCheckoutId,
        responseCode: '0',
        responseDescription: 'Success. Request accepted for processing (SANDBOX)',
        customerMessage: 'Success. Request accepted for processing',
        isSandbox: true,
      };
    }

    // Live Daraja OAuth + STK Push
    try {
      const authUrl =
        env === 'production'
          ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
          : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

      const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const authRes = await axios.get(authUrl, {
        headers: { Authorization: `Basic ${authHeader}` },
      });
      const accessToken = authRes.data.access_token;

      // Timestamp format: YYYYMMDDHHmmss
      const now = new Date();
      const timestamp = now
        .toISOString()
        .replace(/[-:T.]/g, '')
        .slice(0, 14);

      const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

      const stkUrl =
        env === 'production'
          ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
          : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

      const res = await axios.post(
        stkUrl,
        {
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: params.amount,
          PartyA: params.phoneNumber,
          PartyB: shortcode,
          PhoneNumber: params.phoneNumber,
          CallBackURL: callbackUrl,
          AccountReference: params.accountReference,
          TransactionDesc: params.transactionDesc,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      return {
        merchantRequestId: res.data.MerchantRequestID,
        checkoutRequestId: res.data.CheckoutRequestID,
        responseCode: res.data.ResponseCode,
        responseDescription: res.data.ResponseDescription,
        customerMessage: res.data.CustomerMessage,
        isSandbox: false,
      };
    } catch (err: any) {
      this.logger.error(`Daraja STK push failed: ${err.message}`);
      throw new Error(`Daraja API error: ${err.message}`);
    }
  }
}
