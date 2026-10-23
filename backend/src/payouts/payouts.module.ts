import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../common/database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '@haraka/shared-types';
import { payoutRequestSchema, type PayoutRequestDto } from '@haraka/validation';
import { ZodBody } from '../common/decorators/zod-body.decorator';

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRiderPayouts(riderUserId: string) {
    const rider = await this.prisma.rider.findFirst({
      where: { userId: riderUserId, deletedAt: null },
    });
    if (!rider) throw new NotFoundException('Rider profile not found');

    return this.prisma.payout.findMany({
      where: { riderId: rider.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async requestPayout(riderUserId: string, dto: PayoutRequestDto) {
    const rider = await this.prisma.rider.findFirst({
      where: { userId: riderUserId, deletedAt: null },
    });
    if (!rider) throw new NotFoundException('Rider profile not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM riders WHERE id = ${rider.id}::uuid FOR UPDATE`;
      const lockedRider = await tx.rider.findUnique({
        where: { id: rider.id },
        include: { wallet: { include: { ledgerAccount: true } } },
      });
      if (!lockedRider || lockedRider.deletedAt) throw new NotFoundException('Rider profile not found');
      if (lockedRider.verificationStatus !== 'APPROVED') {
        throw new ForbiddenException('Only approved riders can request payouts.');
      }

      const account = lockedRider.wallet?.ledgerAccount;
      if (!account || account.currency !== 'KES' || account.type !== 'LIABILITY') {
        throw new ConflictException('Rider payout ledger account is not configured.');
      }

      const [debits, credits, reserved] = await Promise.all([
        tx.ledgerEntry.aggregate({
          where: { debitAccountId: account.id },
          _sum: { amount: true },
        }),
        tx.ledgerEntry.aggregate({
          where: { creditAccountId: account.id },
          _sum: { amount: true },
        }),
        tx.payout.aggregate({
          where: { riderId: rider.id, status: { in: ['PENDING', 'PROCESSING'] } },
          _sum: { amount: true },
        }),
      ]);
      const available =
        (credits._sum.amount ?? 0) -
        (debits._sum.amount ?? 0) -
        (reserved._sum.amount ?? 0);
      if (dto.amount > available) {
        throw new BadRequestException('Requested payout exceeds the available KES balance.');
      }

      return tx.payout.create({
        data: {
          riderId: rider.id,
          amount: dto.amount,
          currency: 'KES',
          status: 'PENDING',
          method: 'mpesa_b2c',
        },
      });
    });
  }
}

@ApiTags('payouts')
@Controller('rider/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RIDER')
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
    @ZodBody(payoutRequestSchema) body: PayoutRequestDto,
  ) {
    return { data: await this.payoutsService.requestPayout(user.id, body) };
  }
}

@Module({
  controllers: [PayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
