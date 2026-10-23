import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { randomUUID } from 'crypto';
import type { Prisma, TransactionType } from '@haraka/database';

export interface PostTransactionParams {
  type: TransactionType;
  description: string;
  paymentId?: string;
  jobId?: string;
  payoutId?: string;
  refundId?: string;
  actorId?: string;
  entries: Array<{
    debitAccountCode: string;
    creditAccountCode: string;
    amount: number; // minor units (positive integer)
    description?: string;
  }>;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async postTransaction(params: PostTransactionParams) {
    return this.prisma.$transaction((tx) => this.createTransaction(tx, params));
  }

  postTransactionInTransaction(tx: Prisma.TransactionClient, params: PostTransactionParams) {
    return this.createTransaction(tx, params);
  }

  async ensureRiderAccountInTransaction(tx: Prisma.TransactionClient, riderUserId: string) {
    const wallet = await tx.wallet.upsert({
      where: { ownerId: riderUserId },
      update: {},
      create: { ownerId: riderUserId, ownerType: 'rider', currency: 'KES' },
    });
    const riderUpdate = await tx.rider.updateMany({
      where: { userId: riderUserId, deletedAt: null },
      data: { walletId: wallet.id },
    });
    if (riderUpdate.count !== 1) {
      throw new NotFoundException(
        'Rider profile not found while initializing the earnings wallet.',
      );
    }
    const accountCode = `RIDER:${riderUserId}`;
    await tx.ledgerAccount.upsert({
      where: { code: accountCode },
      update: { walletId: wallet.id, type: 'LIABILITY', isActive: true },
      create: {
        walletId: wallet.id,
        code: accountCode,
        name: `Rider balance ${riderUserId}`,
        type: 'LIABILITY',
        currency: 'KES',
      },
    });
    return accountCode;
  }

  private async createTransaction(tx: Prisma.TransactionClient, params: PostTransactionParams) {
    if (params.entries.length === 0) {
      throw new BadRequestException('Transaction must contain at least one balanced entry');
    }

    for (const entry of params.entries) {
      if (!Number.isSafeInteger(entry.amount) || entry.amount <= 0) {
        throw new BadRequestException(
          'Ledger entry amounts must be positive safe integers in KES minor units.',
        );
      }
    }

    const totalAmount = params.entries.reduce((sum, entry) => sum + entry.amount, 0);
    if (!Number.isSafeInteger(totalAmount)) {
      throw new BadRequestException('Ledger transaction total exceeds the safe integer limit.');
    }

    const accountCodes = [
      ...new Set(
        params.entries.flatMap((entry) => [entry.debitAccountCode, entry.creditAccountCode]),
      ),
    ];
    const accounts = await tx.ledgerAccount.findMany({
      where: { code: { in: accountCodes }, isActive: true, currency: 'KES' },
      select: { id: true, code: true },
    });
    const accountsByCode = new Map(accounts.map((account) => [account.code, account.id]));
    const missingCode = accountCodes.find((code) => !accountsByCode.has(code));
    if (missingCode) {
      throw new NotFoundException(`Active KES ledger account not found: ${missingCode}`);
    }

    return tx.ledgerTransaction.create({
      data: {
        reference: `LTX-${randomUUID().toUpperCase()}`,
        type: params.type,
        paymentId: params.paymentId,
        jobId: params.jobId,
        payoutId: params.payoutId,
        refundId: params.refundId,
        description: params.description,
        totalAmount,
        currency: 'KES',
        actorId: params.actorId,
        entries: {
          create: params.entries.map((entry) => ({
            debitAccountId: accountsByCode.get(entry.debitAccountCode)!,
            creditAccountId: accountsByCode.get(entry.creditAccountCode)!,
            amount: entry.amount,
            currency: 'KES',
            description: entry.description,
          })),
        },
      },
      include: { entries: true },
    });
  }

  async getAccountBalance(code: string): Promise<number> {
    const account = await this.prisma.ledgerAccount.findUnique({ where: { code } });
    if (!account) throw new NotFoundException(`Ledger account not found: ${code}`);

    const [debits, credits] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({
        where: { debitAccountId: account.id },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { creditAccountId: account.id },
        _sum: { amount: true },
      }),
    ]);
    const debitTotal = debits._sum.amount ?? 0;
    const creditTotal = credits._sum.amount ?? 0;

    if (['ASSET', 'EXPENSE'].includes(account.type)) {
      return debitTotal - creditTotal;
    }
    return creditTotal - debitTotal;
  }
}
