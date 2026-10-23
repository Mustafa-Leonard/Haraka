import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@haraka/database';
import { PrismaService } from '../common/database/prisma.service';
import { DarajaAdapter } from './daraja.adapter';
import { LedgerService } from '../ledger/ledger.service';
import { buildFareSplitEntries } from '../ledger/fare-entries';
import type { InitiateMpesaDto, PaymentDto, MpesaCallbackDto } from '@haraka/shared-types';

@Injectable()
export class PaymentsService {
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
    if (job.merchantId !== merchant.id) {
      throw new NotFoundException('Job not found');
    }
    if (job.paymentMethod !== 'MPESA_STK') {
      throw new ConflictException('M-Pesa payments are not enabled for this booking.');
    }
    if (['DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED', 'EXPIRED'].includes(job.status)) {
      throw new ConflictException('Payment cannot be initiated for a closed delivery.');
    }

    if (job.quotedAmount % 100 !== 0) {
      throw new ConflictException('The locked fare must be a whole KES amount for M-Pesa payment.');
    }
    const amountMajor = job.quotedAmount / 100;
    const formattedPhone = dto.phoneNumber.replace('+', '');
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      this.assertSamePaymentIntent(
        existing,
        job.id,
        merchant.id,
        dto.phoneNumber,
        job.quotedAmount,
      );
      return this.toPaymentDto(existing);
    }
    const successfulPayment = await this.prisma.payment.findFirst({
      where: {
        jobId: job.id,
        merchantId: merchant.id,
        method: 'MPESA_STK',
        status: 'SUCCEEDED',
      },
    });
    if (successfulPayment) {
      throw new ConflictException('This delivery already has a successful M-Pesa payment.');
    }
    const activePayment = await this.prisma.payment.findFirst({
      where: {
        jobId: job.id,
        merchantId: merchant.id,
        method: 'MPESA_STK',
        status: 'PENDING',
      },
    });
    if (activePayment) {
      throw new ConflictException(
        'A payment attempt is already pending for this delivery. Do not create another attempt.',
      );
    }

    let payment;
    try {
      payment = await this.prisma.payment.create({
        data: {
          jobId: job.id,
          merchantId: merchant.id,
          method: 'MPESA_STK',
          status: 'PENDING',
          amount: job.quotedAmount,
          currency: 'KES',
          idempotencyKey: dto.idempotencyKey,
          phoneNumber: dto.phoneNumber,
          description: `M-Pesa STK push for ${job.referenceCode}`,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
      const concurrentRequest = await this.prisma.payment.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (!concurrentRequest) throw error;
      this.assertSamePaymentIntent(
        concurrentRequest,
        job.id,
        merchant.id,
        dto.phoneNumber,
        job.quotedAmount,
      );
      return this.toPaymentDto(concurrentRequest);
    }

    const stkResult = await this.daraja.initiateStkPush({
      phoneNumber: formattedPhone,
      amount: amountMajor,
      accountReference: job.referenceCode,
      transactionDesc: `Delivery ${job.referenceCode}`,
    });
    payment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: stkResult.checkoutRequestId },
    });

    return this.toPaymentDto(payment);
  }

  async handleMpesaCallback(payload: MpesaCallbackDto): Promise<void> {
    const callback = payload.Body?.stkCallback;
    if (!callback || typeof callback.CheckoutRequestID !== 'string') {
      throw new BadRequestException('Invalid M-Pesa callback payload.');
    }

    const checkoutRequestId = callback.CheckoutRequestID;
    const verifiedStatus = await this.daraja.queryStkPush(checkoutRequestId);
    if (verifiedStatus.resultCode !== callback.ResultCode) {
      throw new BadRequestException(
        'M-Pesa callback does not match the verified transaction status.',
      );
    }
    const resultCode = verifiedStatus.resultCode;

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { providerRef: checkoutRequestId },
        include: { job: true },
      });
      if (!payment || payment.status !== 'PENDING') return;

      const receiptItem = callback.CallbackMetadata?.Item?.find(
        (item) => item.Name === 'MpesaReceiptNumber',
      );
      const receiptValue = receiptItem?.Value;
      const receiptNo =
        typeof receiptValue === 'string' || typeof receiptValue === 'number'
          ? String(receiptValue)
          : '';
      if (resultCode === 0 && receiptNo.length === 0) {
        throw new BadRequestException('Successful M-Pesa callback is missing its receipt number.');
      }
      if (resultCode === 0) {
        const amountValue = callback.CallbackMetadata?.Item?.find(
          (item) => item.Name === 'Amount',
        )?.Value;
        const callbackAmount =
          typeof amountValue === 'number' || typeof amountValue === 'string'
            ? Number(amountValue)
            : Number.NaN;
        if (!Number.isFinite(callbackAmount) || callbackAmount !== payment.amount / 100) {
          throw new BadRequestException(
            'Successful M-Pesa callback amount does not match the locked payment amount.',
          );
        }
      }

      const update = await tx.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data:
          resultCode === 0
            ? {
                status: 'SUCCEEDED',
                providerTxnRef: receiptNo,
                processedAt: new Date(),
              }
            : {
                status: 'FAILED',
                failureReason: verifiedStatus.resultDescription,
                processedAt: new Date(),
              },
      });
      if (update.count !== 1) return;

      await tx.paymentProviderEvent.create({
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
        const riderShare = payment.job.riderShareAmount;
        if (riderShare === null) {
          throw new ConflictException('Rider compensation was not snapshotted for this booking.');
        }
        if (riderShare > payment.amount) {
          throw new ConflictException('Snapshotted rider share exceeds the captured fare.');
        }
        await this.ledger.postTransactionInTransaction(tx, {
          type: 'PAYMENT_CAPTURE',
          description: `M-Pesa payment capture for payment ${payment.id}`,
          paymentId: payment.id,
          entries: buildFareSplitEntries(
            payment.amount,
            riderShare,
            'MPESA_CLEARING',
            'RIDER_PAYABLE',
          ),
        });
      }
    });
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

  private assertSamePaymentIntent(
    payment: {
      jobId: string;
      merchantId: string;
      phoneNumber: string | null;
      amount: number;
    },
    jobId: string,
    merchantId: string,
    phoneNumber: string,
    amount: number,
  ): void {
    if (
      payment.jobId !== jobId ||
      payment.merchantId !== merchantId ||
      payment.phoneNumber !== phoneNumber ||
      payment.amount !== amount
    ) {
      throw new ConflictException(
        'Idempotency key was already used for a different payment intent.',
      );
    }
  }

  private toPaymentDto(payment: {
    id: string;
    jobId: string;
    method: PaymentDto['method'];
    status: PaymentDto['status'];
    amount: number;
    currency: string;
    providerRef: string | null;
    processedAt: Date | null;
    createdAt: Date;
  }): PaymentDto {
    return {
      id: payment.id,
      jobId: payment.jobId,
      method: payment.method,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      providerRef: payment.providerRef,
      processedAt: payment.processedAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
    };
  }
}
