import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRiderRatings(riderId: string) {
    return this.prisma.rating.findMany({
      where: { riderId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
