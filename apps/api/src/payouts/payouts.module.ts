import { Module, Injectable, Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../common/database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '@haraka/shared-types';

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRiderPayouts(riderUserId: string) {
    const rider = await this.prisma.rider.findUnique({ where: { userId: riderUserId } });
    if (!rider) return [];

    return this.prisma.payout.findMany({
      where: { riderId: rider.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestPayout(riderUserId: string, amount: number) {
    const rider = await this.prisma.rider.findUnique({ where: { userId: riderUserId } });
    if (!rider) throw new Error('Rider not found');

    return this.prisma.payout.create({
      data: {
        riderId: rider.id,
        amount,
        currency: 'KES',
        status: 'PENDING',
        method: 'mpesa_b2c',
      },
    });
  }
}

@ApiTags('payouts')
@Controller('rider/payouts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get()
  @ApiOperation({ summary: 'List rider payouts' })
  async getPayouts(@CurrentUser() user: AuthUser) {
    return { data: await this.payoutsService.getRiderPayouts(user.id) };
  }

  @Post()
  @ApiOperation({ summary: 'Request payout to M-Pesa' })
  async requestPayout(
    @CurrentUser() user: AuthUser,
    @Body('amount') amount: number,
  ) {
    return { data: await this.payoutsService.requestPayout(user.id, amount) };
  }
}

@Module({
  controllers: [PayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
