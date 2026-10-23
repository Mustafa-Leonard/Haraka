import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { randomUUID } from 'crypto';

export interface StkPushParams {
  phoneNumber: string; // 2547XXXXXXXX
  amount: number; // major KES units (e.g. 150)
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

export interface StkPushStatus {
  checkoutRequestId: string;
  resultCode: number;
  resultDescription: string;
}

@Injectable()
export class DarajaAdapter {
  private readonly logger = new Logger(DarajaAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async initiateStkPush(params: StkPushParams): Promise<StkPushResult> {
    const env = this.config.get<string>('MPESA_ENV', 'sandbox');
    const consumerKey = this.config.get<string>('MPESA_CONSUMER_KEY');
    const consumerSecret = this.config.get<string>('MPESA_CONSUMER_SECRET');
    const shortcode = this.config.get<string>('MPESA_SHORTCODE', env === 'sandbox' ? '174379' : '');
    const passkey = this.config.get<string>('MPESA_PASSKEY');
    const callbackUrl = this.config.get<string>('MPESA_CALLBACK_URL', '');

    if (env === 'sandbox') {
      const mockCheckoutId = `sandbox-${randomUUID()}`;
      const mockMerchantId = `sandbox-${randomUUID()}`;
      this.logger.log('M-Pesa sandbox simulation initiated.');
      return {
        merchantRequestId: mockMerchantId,
        checkoutRequestId: mockCheckoutId,
        responseCode: '0',
        responseDescription: 'Success. Request accepted for processing (SANDBOX)',
        customerMessage: 'Success. Request accepted for processing',
        isSandbox: true,
      };
    }

    if (
      env !== 'production' ||
      !consumerKey ||
      consumerKey.startsWith('YOUR_') ||
      !consumerSecret ||
      !shortcode ||
      !passkey ||
      !callbackUrl
    ) {
      throw new ServiceUnavailableException('Live M-Pesa integration is not fully configured.');
    }

    try {
      const authUrl = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

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

      const stkUrl = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

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
      this.logger.error('Daraja STK push request failed.');
      throw new ServiceUnavailableException('M-Pesa payment request failed. Please retry later.');
    }
  }

  async queryStkPush(checkoutRequestId: string): Promise<StkPushStatus> {
    const env = this.config.get<string>('MPESA_ENV', 'sandbox');
    const consumerKey = this.config.get<string>('MPESA_CONSUMER_KEY');
    const consumerSecret = this.config.get<string>('MPESA_CONSUMER_SECRET');
    const shortcode = this.config.get<string>('MPESA_SHORTCODE', env === 'sandbox' ? '174379' : '');
    const passkey = this.config.get<string>('MPESA_PASSKEY');
    if (
      !['sandbox', 'production'].includes(env) ||
      !consumerKey ||
      !consumerSecret ||
      !shortcode ||
      !passkey
    ) {
      throw new ServiceUnavailableException('M-Pesa transaction verification is not configured.');
    }

    const baseUrl =
      env === 'sandbox' ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';
    try {
      const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const auth = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${authHeader}` },
        timeout: 10000,
      });
      const accessToken = auth.data?.access_token;
      if (typeof accessToken !== 'string' || accessToken.length === 0) {
        throw new Error('M-Pesa authentication response did not contain an access token.');
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/[-:T.]/g, '')
        .slice(0, 14);
      const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
      const response = await axios.post(
        `${baseUrl}/mpesa/stkpushquery/v1/query`,
        {
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 10000,
        },
      );

      const result = response.data;
      const resultCode = Number(result?.ResultCode);
      if (
        result?.CheckoutRequestID !== checkoutRequestId ||
        !Number.isInteger(resultCode) ||
        typeof result?.ResultDesc !== 'string'
      ) {
        throw new Error('M-Pesa status response did not contain a valid transaction result.');
      }

      return {
        checkoutRequestId,
        resultCode,
        resultDescription: result.ResultDesc,
      };
    } catch (error) {
      this.logger.error('Daraja STK status verification failed.');
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        'M-Pesa transaction status could not be verified. The callback can be retried.',
      );
    }
  }
}
