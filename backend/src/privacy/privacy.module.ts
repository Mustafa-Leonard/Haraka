import { Module, Injectable, Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../common/database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '@haraka/shared-types';

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  async submitDataRequest(userId: string, type: any, description?: string) {
    return this.prisma.privacyRequest.create({
      data: {
        userId,
        type,
        description,
        status: 'PENDING',
      },
    });
  }

  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        merchant: { include: { addresses: true, jobs: true } },
        rider: { include: { vehicles: true } },
      },
    });

    return {
      user: {
        id: user?.id,
        phone: user?.phone,
        email: user?.email,
        displayName: user?.displayName,
        createdAt: user?.createdAt,
      },
      merchant: user?.merchant,
      rider: user?.rider,
      exportTimestamp: new Date().toISOString(),
      regulations: 'Kenya Data Protection Act 2019',
    };
  }
}

@ApiTags('privacy')
@Controller('privacy')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Post('requests')
  @ApiOperation({ summary: 'Submit personal data access or erasure request (KDPA 2019)' })
  async createRequest(
    @CurrentUser() user: AuthUser,
    @Body('type') type: any,
    @Body('description') description?: string,
  ) {
    return { data: await this.privacyService.submitDataRequest(user.id, type, description) };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export user data in machine-readable JSON format' })
  async exportData(@CurrentUser() user: AuthUser) {
    return { data: await this.privacyService.exportUserData(user.id) };
  }
}

@Module({
  controllers: [PrivacyController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
