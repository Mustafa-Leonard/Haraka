import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PaymentsService } from '../src/payments/payments.service';
import type { PrismaService } from '../src/common/database/prisma.service';
import type { DarajaAdapter } from '../src/payments/daraja.adapter';

const validSuccessCallback = {
  Body: {
    stkCallback: {
      CheckoutRequestID: 'checkout-123',
      ResultCode: 0,
      ResultDesc: 'Success',
      CallbackMetadata: {
        Item: [
          { Name: 'Amount', Value: 150 },
          { Name: 'MpesaReceiptNumber', Value: 'RCP123' },
        ],
      },
    },
  },
};

describe('PaymentsService M-Pesa callbacks', () => {
  it('does not process callbacks when provider status cannot be independently verified', async () => {
    const prisma = { $transaction: vi.fn() };
    const daraja = {
      queryStkPush: vi
        .fn()
        .mockRejectedValue(new ServiceUnavailableException('Provider unavailable')),
    };
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      daraja as unknown as DarajaAdapter,
      {} as never,
    );

    await expect(service.handleMpesaCallback(validSuccessCallback)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(daraja.queryStkPush).toHaveBeenCalledWith('checkout-123');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects callbacks that disagree with the provider-verified status', async () => {
    const prisma = { $transaction: vi.fn() };
    const daraja = {
      queryStkPush: vi.fn().mockResolvedValue({
        checkoutRequestId: 'checkout-123',
        resultCode: 1032,
        resultDescription: 'Request cancelled',
      }),
    };
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      daraja as unknown as DarajaAdapter,
      {} as never,
    );

    await expect(service.handleMpesaCallback(validSuccessCallback)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects callbacks missing a checkout request identifier', async () => {
    const prisma = { $transaction: vi.fn() };
    const daraja = { queryStkPush: vi.fn() };
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      daraja as unknown as DarajaAdapter,
      {} as never,
    );

    await expect(
      service.handleMpesaCallback({ Body: { stkCallback: {} } } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(daraja.queryStkPush).not.toHaveBeenCalled();
  });
});
