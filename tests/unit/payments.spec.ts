import { describe, expect, it, vi } from 'vitest';
import { PaymentsService } from '../../backend/src/payments/payments.service';
import type { PrismaService } from '../../backend/src/common/database/prisma.service';
import type { LedgerService } from '../../backend/src/ledger/ledger.service';
import type { DarajaAdapter } from '../../backend/src/payments/daraja.adapter';

const pendingPayment = {
  id: 'payment-id',
  jobId: 'job-id',
  merchantId: 'merchant-id',
  method: 'MPESA_STK',
  status: 'PENDING',
  amount: 15000,
  currency: 'KES',
  idempotencyKey: 'payment-attempt-key',
  providerRef: 'checkout-id',
  providerTxnRef: null,
  job: { riderShareAmount: 3000 },
  phoneNumber: '+254712345678',
  processedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

function createService(
  prisma: Record<string, unknown>,
  ledger = { postTransactionInTransaction: vi.fn() },
) {
  return {
    service: new PaymentsService(
      prisma as unknown as PrismaService,
      {
        initiateStkPush: vi.fn(),
        queryStkPush: vi.fn().mockResolvedValue({
          checkoutRequestId: 'checkout-id',
          resultCode: 0,
          resultDescription: 'Provider verified success',
        }),
      } as unknown as DarajaAdapter,
      ledger as unknown as LedgerService,
    ),
    ledger,
  };
}

describe('PaymentsService', () => {
  it('returns an existing payment for the same idempotency key without another provider call', async () => {
    const payment = { ...pendingPayment };
    const prisma = {
      job: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'job-id',
          merchantId: 'merchant-id',
          quotedAmount: 15000,
          paymentMethod: 'MPESA_STK',
          status: 'REQUESTED',
        }),
      },
      merchant: { findUnique: vi.fn().mockResolvedValue({ id: 'merchant-id' }) },
      payment: {
        findUnique: vi.fn().mockResolvedValue(payment),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };
    const { service } = createService(prisma);

    const result = await service.initiateMpesaPayment('merchant-user-id', {
      jobId: 'job-id',
      phoneNumber: '+254712345678',
      idempotencyKey: 'payment-attempt-key',
    });

    expect(result.id).toBe(payment.id);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('does not let a merchant initiate payment for another merchant’s job', async () => {
    const daraja = { initiateStkPush: vi.fn() };
    const prisma = {
      job: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'job-id', merchantId: 'owner-id', quotedAmount: 15000 }),
      },
      merchant: { findUnique: vi.fn().mockResolvedValue({ id: 'different-merchant-id' }) },
      payment: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    };
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      daraja as unknown as DarajaAdapter,
      { postTransactionInTransaction: vi.fn() } as unknown as LedgerService,
    );

    await expect(
      service.initiateMpesaPayment('other-user-id', {
        jobId: 'job-id',
        phoneNumber: '+254712345678',
        idempotencyKey: 'payment-attempt-key',
      }),
    ).rejects.toThrow('Job not found');
    expect(daraja.initiateStkPush).not.toHaveBeenCalled();
  });

  it('rejects M-Pesa initiation for a COD booking before creating a payment', async () => {
    const prisma = {
      job: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'job-id',
          merchantId: 'merchant-id',
          quotedAmount: 15000,
          paymentMethod: 'CASH_ON_DELIVERY',
          status: 'REQUESTED',
        }),
      },
      merchant: { findUnique: vi.fn().mockResolvedValue({ id: 'merchant-id' }) },
      payment: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    };
    const daraja = { initiateStkPush: vi.fn() };
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      daraja as unknown as DarajaAdapter,
      { postTransactionInTransaction: vi.fn() } as unknown as LedgerService,
    );

    await expect(
      service.initiateMpesaPayment('merchant-user-id', {
        jobId: 'job-id',
        phoneNumber: '+254712345678',
        idempotencyKey: 'payment-attempt-key',
      }),
    ).rejects.toThrow('M-Pesa payments are not enabled for this booking');
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(daraja.initiateStkPush).not.toHaveBeenCalled();
  });

  it('prevents a second M-Pesa attempt after a successful payment', async () => {
    const prisma = {
      job: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'job-id',
          merchantId: 'merchant-id',
          quotedAmount: 15000,
          paymentMethod: 'MPESA_STK',
          status: 'REQUESTED',
        }),
      },
      merchant: { findUnique: vi.fn().mockResolvedValue({ id: 'merchant-id' }) },
      payment: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue({ ...pendingPayment, status: 'SUCCEEDED' }),
        create: vi.fn(),
      },
    };
    const daraja = { initiateStkPush: vi.fn() };
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      daraja as unknown as DarajaAdapter,
      { postTransactionInTransaction: vi.fn() } as unknown as LedgerService,
    );

    await expect(
      service.initiateMpesaPayment('merchant-user-id', {
        jobId: 'job-id',
        phoneNumber: '+254712345678',
        idempotencyKey: 'new-payment-attempt-key',
      }),
    ).rejects.toThrow('already has a successful M-Pesa payment');
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(daraja.initiateStkPush).not.toHaveBeenCalled();
  });

  it('posts the ledger capture in the same transaction as the first successful callback', async () => {
    const tx = {
      payment: {
        findUnique: vi.fn().mockResolvedValue(pendingPayment),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      paymentProviderEvent: { create: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn((callback: (client: typeof tx) => Promise<void>) => callback(tx)),
    };
    const { service, ledger } = createService(prisma);

    await service.handleMpesaCallback({
      Body: {
        stkCallback: {
          MerchantRequestID: 'merchant-request-id',
          CheckoutRequestID: 'checkout-id',
          ResultCode: 0,
          ResultDesc: 'Success',
          CallbackMetadata: {
            Item: [
              { Name: 'MpesaReceiptNumber', Value: 'ABC123' },
              { Name: 'Amount', Value: 150 },
            ],
          },
        },
      },
    });

    expect(tx.payment.updateMany).toHaveBeenCalledOnce();
    expect(tx.paymentProviderEvent.create).toHaveBeenCalledOnce();
    expect(ledger.postTransactionInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        paymentId: pendingPayment.id,
        entries: [
          expect.objectContaining({ creditAccountCode: 'PLATFORM_REVENUE', amount: 12000 }),
          expect.objectContaining({ creditAccountCode: 'RIDER_PAYABLE', amount: 3000 }),
        ],
      }),
    );
  });

  it('ignores duplicate callbacks for an already processed payment', async () => {
    const tx = {
      payment: {
        findUnique: vi.fn().mockResolvedValue({ ...pendingPayment, status: 'SUCCEEDED' }),
        updateMany: vi.fn(),
      },
      paymentProviderEvent: { create: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn((callback: (client: typeof tx) => Promise<void>) => callback(tx)),
    };
    const { service, ledger } = createService(prisma);

    await service.handleMpesaCallback({
      Body: {
        stkCallback: {
          MerchantRequestID: 'merchant-request-id',
          CheckoutRequestID: 'checkout-id',
          ResultCode: 0,
          ResultDesc: 'Success',
          CallbackMetadata: {
            Item: [
              { Name: 'MpesaReceiptNumber', Value: 'ABC123' },
              { Name: 'Amount', Value: 150 },
            ],
          },
        },
      },
    });

    expect(tx.payment.updateMany).not.toHaveBeenCalled();
    expect(tx.paymentProviderEvent.create).not.toHaveBeenCalled();
    expect(ledger.postTransactionInTransaction).not.toHaveBeenCalled();
  });

  it('rejects a successful callback whose amount differs from the locked payment', async () => {
    const tx = {
      payment: {
        findUnique: vi.fn().mockResolvedValue(pendingPayment),
        updateMany: vi.fn(),
      },
      paymentProviderEvent: { create: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn((callback: (client: typeof tx) => Promise<void>) => callback(tx)),
    };
    const { service, ledger } = createService(prisma);

    await expect(
      service.handleMpesaCallback({
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant-request-id',
            CheckoutRequestID: 'checkout-id',
            ResultCode: 0,
            ResultDesc: 'Success',
            CallbackMetadata: {
              Item: [
                { Name: 'MpesaReceiptNumber', Value: 'ABC123' },
                { Name: 'Amount', Value: 149 },
              ],
            },
          },
        },
      }),
    ).rejects.toThrow('does not match the locked payment amount');

    expect(tx.payment.updateMany).not.toHaveBeenCalled();
    expect(ledger.postTransactionInTransaction).not.toHaveBeenCalled();
  });
});
