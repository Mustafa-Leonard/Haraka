import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  async listDisputes() {
    return this.prisma.dispute.findMany({
      orderBy: { createdAt: 'desc' },
      include: { job: true },
    });
  }

  async resolveDispute(id: string, resolution: any, note?: string) {
    return this.prisma.dispute.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolution,
        resolutionNote: note,
        resolvedAt: new Date(),
      },
    });
  }
}
