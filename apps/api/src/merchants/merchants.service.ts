import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import type {
  MerchantProfileDto,
  UpdateMerchantProfileDto,
  MerchantDashboardDto,
  AddressDto,
  CreateAddressDto,
} from '@haraka/shared-types';

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<MerchantProfileDto> {
    let merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) {
      merchant = await this.prisma.merchant.create({
        data: {
          userId,
          businessName: 'My Business',
        },
      });
    }

    return {
      id: merchant.id,
      userId: merchant.userId,
      businessName: merchant.businessName,
      businessType: merchant.businessType,
      description: merchant.description,
      logoUrl: merchant.logoUrl,
      isVerified: merchant.isVerified,
      createdAt: merchant.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, dto: UpdateMerchantProfileDto): Promise<MerchantProfileDto> {
    const merchant = await this.prisma.merchant.update({
      where: { userId },
      data: {
        businessName: dto.businessName,
        businessType: dto.businessType,
        description: dto.description,
      },
    });

    return {
      id: merchant.id,
      userId: merchant.userId,
      businessName: merchant.businessName,
      businessType: merchant.businessType,
      description: merchant.description,
      logoUrl: merchant.logoUrl,
      isVerified: merchant.isVerified,
      createdAt: merchant.createdAt.toISOString(),
    };
  }

  async getDashboard(userId: string): Promise<MerchantDashboardDto> {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) {
      return {
        activeJobs: 0,
        todayJobs: 0,
        todayRevenue: 0,
        currency: 'KES',
        weeklyStats: [],
      };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeJobs, todayJobs, todayPayments] = await Promise.all([
      this.prisma.job.count({
        where: {
          merchantId: merchant.id,
          status: { in: ['REQUESTED', 'MATCHING', 'OFFERED', 'ACCEPTED', 'ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DROPOFF'] },
        },
      }),
      this.prisma.job.count({
        where: {
          merchantId: merchant.id,
          createdAt: { gte: todayStart },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          merchantId: merchant.id,
          status: 'SUCCEEDED',
          processedAt: { gte: todayStart },
        },
      }),
    ]);

    const todayRevenue = todayPayments.reduce((acc, p) => acc + p.amount, 0);

    return {
      activeJobs,
      todayJobs,
      todayRevenue,
      currency: 'KES',
      weeklyStats: [
        { date: 'Mon', jobs: 3, revenue: 42000 },
        { date: 'Tue', jobs: 5, revenue: 68000 },
        { date: 'Wed', jobs: 2, revenue: 26000 },
        { date: 'Thu', jobs: 7, revenue: 95000 },
        { date: 'Fri', jobs: 8, revenue: 112000 },
        { date: 'Sat', jobs: 4, revenue: 54000 },
        { date: 'Sun', jobs: todayJobs, revenue: todayRevenue },
      ],
    };
  }

  async getAddresses(userId: string): Promise<AddressDto[]> {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) return [];

    const addresses = await this.prisma.address.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
    });

    return addresses.map((a) => ({
      id: a.id,
      label: a.label,
      street: a.street,
      building: a.building,
      area: a.area,
      town: a.town,
      instructions: a.instructions,
      latitude: a.latitude ? Number(a.latitude) : null,
      longitude: a.longitude ? Number(a.longitude) : null,
      isDefault: a.isDefault,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async createAddress(userId: string, dto: CreateAddressDto): Promise<AddressDto> {
    let merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) {
      merchant = await this.prisma.merchant.create({
        data: { userId, businessName: 'My Business' },
      });
    }

    const address = await this.prisma.address.create({
      data: {
        merchantId: merchant.id,
        label: dto.label,
        street: dto.street,
        building: dto.building,
        area: dto.area,
        town: dto.town,
        instructions: dto.instructions,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isDefault: dto.isDefault ?? false,
      },
    });

    return {
      id: address.id,
      label: address.label,
      street: address.street,
      building: address.building,
      area: address.area,
      town: address.town,
      instructions: address.instructions,
      latitude: address.latitude ? Number(address.latitude) : null,
      longitude: address.longitude ? Number(address.longitude) : null,
      isDefault: address.isDefault,
      createdAt: address.createdAt.toISOString(),
    };
  }
}
