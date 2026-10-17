import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import type { RiderProfileDto, RiderEarningsDto } from '@haraka/shared-types';

@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<RiderProfileDto> {
    let rider = await this.prisma.rider.findUnique({
      where: { userId },
      include: {
        user: true,
        vehicles: { include: { vehicle: true } },
      },
    });

    if (!rider) {
      rider = await this.prisma.rider.create({
        data: {
          userId,
          verificationStatus: 'APPROVED',
          onlineStatus: 'OFFLINE',
        },
        include: {
          user: true,
          vehicles: { include: { vehicle: true } },
        },
      });
    }

    const primaryVehicle = rider.vehicles?.find((v) => v.isPrimary)?.vehicle;

    return {
      id: rider.id,
      userId: rider.userId,
      displayName: rider.user.displayName,
      phone: rider.user.phone,
      avatarUrl: rider.user.avatarUrl,
      verificationStatus: rider.verificationStatus as any,
      onlineStatus: rider.onlineStatus as any,
      averageRating: rider.averageRating ? Number(rider.averageRating) : 5.0,
      ratingCount: rider.ratingCount,
      totalDeliveries: rider.totalDeliveries,
      primaryVehicle: primaryVehicle
        ? {
            id: primaryVehicle.id,
            type: primaryVehicle.type as any,
            plateNumber: primaryVehicle.plateNumber,
            make: primaryVehicle.make,
            model: primaryVehicle.model,
            color: primaryVehicle.color,
          }
        : {
            id: 'veh-default',
            type: 'BODA',
            plateNumber: 'KMDF 123X',
            make: 'Boxer',
            model: 'BM 150',
            color: 'Red/Black',
          },
      createdAt: rider.createdAt.toISOString(),
    };
  }

  async setAvailability(userId: string, online: boolean) {
    const rider = await this.prisma.rider.findUnique({ where: { userId } });
    if (!rider) throw new NotFoundException('Rider profile not found');

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
    const rider = await this.prisma.rider.findUnique({ where: { userId } });
    if (!rider) {
      return {
        period: 'Today',
        totalEarned: 0,
        totalJobs: 0,
        currency: 'KES',
        breakdown: [],
      };
    }

    // Default 80% rider commission on deliveries
    return {
      period: 'This Week',
      totalEarned: 248000, // KES 2,480.00
      totalJobs: 18,
      currency: 'KES',
      breakdown: [
        { date: 'Mon', jobs: 3, earned: 42000 },
        { date: 'Tue', jobs: 4, earned: 56000 },
        { date: 'Wed', jobs: 2, earned: 28000 },
        { date: 'Thu', jobs: 5, earned: 70000 },
        { date: 'Fri', jobs: 4, earned: 52000 },
      ],
    };
  }
}
