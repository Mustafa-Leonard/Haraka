import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import type { RiderProfileDto, RiderEarningsDto } from '@haraka/shared-types';

@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<RiderProfileDto> {
    const rider = await this.prisma.rider.findFirst({
      where: { userId, deletedAt: null },
      include: {
        user: true,
        vehicles: { include: { vehicle: true } },
      },
    });
    if (!rider) {
      throw new NotFoundException('Rider profile not found');
    }

    const primaryVehicle = rider.vehicles?.find((v) => v.isPrimary)?.vehicle;

    return {
      id: rider.id,
      userId: rider.userId,
      displayName: rider.user.displayName,
      phone: rider.user.phone,
      avatarUrl: rider.user.avatarUrl,
      verificationStatus: rider.verificationStatus,
      onlineStatus: rider.onlineStatus,
      averageRating: rider.averageRating ? Number(rider.averageRating) : null,
      ratingCount: rider.ratingCount,
      totalDeliveries: rider.totalDeliveries,
      primaryVehicle: primaryVehicle
        ? {
            id: primaryVehicle.id,
            type: primaryVehicle.type,
            plateNumber: primaryVehicle.plateNumber,
            make: primaryVehicle.make,
            model: primaryVehicle.model,
            color: primaryVehicle.color,
          }
        : null,
      createdAt: rider.createdAt.toISOString(),
    };
  }

  async setAvailability(userId: string, online: boolean) {
    const rider = await this.prisma.rider.findFirst({
      where: { userId, deletedAt: null },
      include: { vehicles: { include: { vehicle: true } } },
    });
    if (!rider) throw new NotFoundException('Rider profile not found');
    if (
      online &&
      (rider.verificationStatus !== 'APPROVED' ||
        !rider.vehicles.some(
          (assignment) =>
            assignment.isPrimary && !assignment.removedAt && assignment.vehicle.isActive,
        ))
    ) {
      throw new ForbiddenException(
        'An approved rider profile and active assigned vehicle are required to go online.',
      );
    }

    const updated = await this.prisma.rider.update({
      where: { id: rider.id },
      data: {
        onlineStatus: online ? 'ONLINE' : 'OFFLINE',
        lastOnlineAt: online ? new Date() : rider.lastOnlineAt,
        lastOfflineAt: !online ? new Date() : rider.lastOfflineAt,
      },
    });

    return { online: updated.onlineStatus === 'ONLINE' };
  }

  async getEarnings(userId: string): Promise<RiderEarningsDto> {
    const rider = await this.prisma.rider.findFirst({
      where: { userId, deletedAt: null },
      include: { wallet: { include: { ledgerAccount: true } } },
    });
    if (!rider) {
      throw new NotFoundException('Rider profile not found');
    }

    const nowInNairobi = new Date(Date.now() + 3 * 60 * 60 * 1000);
    nowInNairobi.setUTCHours(0, 0, 0, 0);
    nowInNairobi.setUTCDate(nowInNairobi.getUTCDate() - ((nowInNairobi.getUTCDay() + 6) % 7));
    const weekStart = new Date(nowInNairobi.getTime() - 3 * 60 * 60 * 1000);

    const account = rider.wallet?.ledgerAccount;
    const [completedJobs, debitTotal, creditTotal, reservedPayouts, recentEntries] =
      await Promise.all([
        this.prisma.job.findMany({
          where: { riderId: rider.id, status: 'COMPLETED', updatedAt: { gte: weekStart } },
          select: { updatedAt: true },
        }),
        account
          ? this.prisma.ledgerEntry.aggregate({
              where: { debitAccountId: account.id },
              _sum: { amount: true },
            })
          : Promise.resolve({ _sum: { amount: null } }),
        account
          ? this.prisma.ledgerEntry.aggregate({
              where: { creditAccountId: account.id },
              _sum: { amount: true },
            })
          : Promise.resolve({ _sum: { amount: null } }),
        this.prisma.payout.aggregate({
          where: { riderId: rider.id, status: { in: ['PENDING', 'PROCESSING'] } },
          _sum: { amount: true },
        }),
        account
          ? this.prisma.ledgerEntry.findMany({
              where: {
                transaction: { postedAt: { gte: weekStart } },
                OR: [{ debitAccountId: account.id }, { creditAccountId: account.id }],
              },
              select: {
                amount: true,
                debitAccountId: true,
                transaction: { select: { postedAt: true } },
              },
            })
          : Promise.resolve([]),
      ]);

    const debitBalance = debitTotal._sum.amount ?? 0;
    const creditBalance = creditTotal._sum.amount ?? 0;
    const ledgerBalance =
      account?.type === 'ASSET' || account?.type === 'EXPENSE'
        ? debitBalance - creditBalance
        : creditBalance - debitBalance;
    const earningsByDate = new Map<string, { jobs: number; earned: number }>();
    const dateInNairobi = (date: Date) =>
      new Date(date.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

    for (const job of completedJobs) {
      const date = dateInNairobi(job.updatedAt);
      const current = earningsByDate.get(date) ?? { jobs: 0, earned: 0 };
      current.jobs += 1;
      earningsByDate.set(date, current);
    }

    for (const entry of recentEntries) {
      const date = dateInNairobi(entry.transaction.postedAt);
      const current = earningsByDate.get(date) ?? { jobs: 0, earned: 0 };
      current.earned += entry.debitAccountId === account?.id ? -entry.amount : entry.amount;
      earningsByDate.set(date, current);
    }

    return {
      period: 'Available balance',
      availableBalance: Math.max(0, ledgerBalance - (reservedPayouts._sum.amount ?? 0)),
      completedJobsThisWeek: completedJobs.length,
      currency: 'KES',
      ledgerActivity: [...earningsByDate]
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
        .map(([date, values]) => ({
          date,
          completedJobs: values.jobs,
          netChange: values.earned,
        })),
    };
  }
}
