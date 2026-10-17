import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { DarajaAdapter } from './daraja.adapter';
import { LedgerService } from '../ledger/ledger.service';
import type { InitiateMpesaDto, PaymentDto, MpesaCallbackDto } from '@haraka/shared-types';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly daraja: DarajaAdapter,
    private readonly ledger: LedgerService,
  ) {}

  async initiateMpesaPayment(merchantUserId: string, dto: InitiateMpesaDto): Promise<PaymentDto> {
    const job = await this.prisma.job.findUnique({ where: { id: dto.jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const merchant = await this.prisma.merchant.findUnique({ where: { userId: merchantUserId } });
    if (!merchant) throw new NotFoundException('Merchant not found');

    // Amount in major KES units for M-Pesa API (e.g. 150.00 KES from 15000 minor units)
    const amountMajor = Math.max(1, Math.round(job.quotedAmount / 100));

    // Strip + prefix for Safaricom format: 254XXXXXXXXX
    const formattedPhone = dto.phoneNumber.replace('+', '');

    const stkResult = await this.daraja.initiateStkPush({
      phoneNumber: formattedPhone,
      amount: amountMajor,
      accountReference: job.referenceCode,
      transactionDesc: `Delivery ${job.referenceCode}`,
    });

    const payment = await this.prisma.payment.create({
      data: {
        jobId: job.id,
        merchantId: merchant.id,
        method: 'MPESA_STK',
        status: 'PENDING',
        amount: job.quotedAmount,
        currency: 'KES',
        idempotencyKey: dto.idempotencyKey,
        providerRef: stkResult.checkoutRequestId,
        phoneNumber: dto.phoneNumber,
        description: `M-Pesa STK push for ${job.referenceCode}`,
      },
    });

    // In sandbox mode, schedule a simulated successful callback after 2 seconds to complete the loop
    if (stkResult.isSandbox) {
      setTimeout(async () => {
        await this.handleMpesaCallback({
          Body: {
            stkCallback: {
              MerchantRequestID: stkResult.merchantRequestId,
              CheckoutRequestID: stkResult.checkoutRequestId,
              ResultCode: 0,
              ResultDesc: 'The service request is processed successfully (SANDBOX)',
              CallbackMetadata: {
                Item: [
                  { Name: 'Amount', Value: amountMajor },
                  { Name: 'MpesaReceiptNumber', Value: `NLX${Date.now().toString().slice(-7)}` },
                  { Name: 'PhoneNumber', Value: formattedPhone },
                ],
              },
            },
          },
        });
      }, 2000);
    }

    return {
      id: payment.id,
      jobId: payment.jobId,
      method: payment.method as any,
      status: payment.status as any,
      amount: payment.amount,
      currency: payment.currency,
      providerRef: payment.providerRef,
      processedAt: payment.processedAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    };
  }

  async handleMpesaCallback(payload: MpesaCallbackDto): Promise<void> {
    const callback = payload.Body?.stkCallback;
    if (!callback) return;

    const checkoutRequestId = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;

    this.logger.log(`Received M-Pesa callback for CheckoutRequestID ${checkoutRequestId} (ResultCode: ${resultCode})`);

    const payment = await this.prisma.payment.findUnique({
      where: { providerRef: checkoutRequestId },
    });

    if (!payment) {
      this.logger.warn(`No payment record matched CheckoutRequestID ${checkoutRequestId}`);
      return;
    }

    // Persist raw provider event
    await this.prisma.paymentProviderEvent.create({
      data: {
        paymentId: payment.id,
        provider: 'mpesa',
        eventType: 'stk_callback',
        providerRef: checkoutRequestId,
        rawPayload: payload as any,
        processedAt: new Date(),
      },
    });

    if (resultCode === 0) {
      // Payment Succeeded
      const receiptItem = callback.CallbackMetadata?.Item?.find((i) => i.Name === 'MpesaReceiptNumber');
      const receiptNo = (receiptItem?.Value as string) || `MPE-${Date.now()}`;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCEEDED',
          providerTxnRef: receiptNo,
          processedAt: new Date(),
        },
      });

      // Post balanced double-entry ledger entries:
      // Debit: MPESA_CLEARING (Asset)
      // Credit: PLATFORM_REVENUE (Revenue)
      await this.ledger.postTransaction({
        type: 'PAYMENT_CAPTURE',
        description: `M-Pesa payment capture for payment ${payment.id} (Receipt: ${receiptNo})`,
        paymentId: payment.id,
        entries: [
          {
            debitAccountCode: 'MPESA_CLEARING',
            creditAccountCode: 'PLATFORM_REVENUE',
            amount: payment.amount,
            description: `M-Pesa STK capture ${receiptNo}`,
          },
        ],
      });

      this.logger.log(`Payment ${payment.id} marked as SUCCEEDED with receipt ${receiptNo}`);
    } else {
      // Payment Failed or Cancelled by customer
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: callback.ResultDesc,
        },
      });
      this.logger.warn(`Payment ${payment.id} FAILED: ${callback.ResultDesc}`);
    }
  }

  async getMerchantPayments(merchantUserId: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId: merchantUserId } });
    if (!merchant) return [];

    const payments = await this.prisma.payment.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return payments.map((p) => ({
      id: p.id,
      jobId: p.jobId,
      method: p.method,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      providerRef: p.providerRef,
      processedAt: p.processedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    }));
  }
}
