import type { PaymentMethod, PaymentStatus, PayoutStatus, CODStatus } from './enums';

export interface PaymentDto {
  id: string;
  jobId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number; // minor units
  currency: string;
  providerRef: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface InitiateMpesaDto {
  jobId: string;
  phoneNumber: string;
  idempotencyKey?: string;
}

export interface MpesaCallbackDto {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>;
      };
    };
  };
}

export interface PayoutDto {
  id: string;
  riderId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  method: string;
  period: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface CodRecordDto {
  id: string;
  jobId: string;
  amount: number;
  currency: string;
  status: CODStatus;
  collectedAt: string | null;
  settledAt: string | null;
}

export interface LedgerSummaryDto {
  accountCode: string;
  accountName: string;
  balance: number; // minor units (computed)
  currency: string;
}
