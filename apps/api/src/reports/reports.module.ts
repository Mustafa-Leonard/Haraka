import { Module, Injectable, Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../common/database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateFinancialSummary() {
    const totalPayments = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'SUCCEEDED' },
    });

    const totalJobs = await this.prisma.job.count();

    return {
      totalRevenue: totalPayments._sum.amount ?? 0,
      currency: 'KES',
      totalJobs,
      generatedAt: new Date().toISOString(),
    };
  }
}

@ApiTags('reports')
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth('access-token')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Platform financial and volume summary' })
  async getSummary() {
    return { data: await this.reportsService.generateFinancialSummary() };
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
