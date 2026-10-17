import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '@haraka/shared-types';
import {
  locationUpdateSchema,
  disputeReportSchema,
  ratingSchema,
  type LocationUpdateDto,
} from '@haraka/validation';
import { ZodBody } from '../common/decorators/zod-body.decorator';

@ApiTags('tracking')
@Controller()
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('rider/location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'High-frequency GPS coordinate stream from rider app' })
  async updateLocation(
    @CurrentUser() user: AuthUser,
    @ZodBody(locationUpdateSchema) body: LocationUpdateDto,
  ) {
    return this.trackingService.ingestLocation(user.id, body as any);
  }

  // --- Public Unauthenticated Tracking Endpoints ---

  @Get('public/tracking/:token')
  @ApiOperation({ summary: 'Recipient sanitized delivery tracking view' })
  async getPublicTracking(@Param('token') token: string) {
    const data = await this.trackingService.getPublicTracking(token);
    return { data };
  }

  @Post('public/tracking/:token/report')
  @ApiOperation({ summary: 'Recipient reports an issue with the delivery' })
  async reportIssue(
    @Param('token') token: string,
    @ZodBody(disputeReportSchema) body: { category: string; description: string },
  ) {
    return this.trackingService.reportPublicIssue(token, body.category, body.description);
  }

  @Post('public/tracking/:token/rating')
  @ApiOperation({ summary: 'Recipient rates a completed delivery' })
  async submitRating(
    @Param('token') token: string,
    @ZodBody(ratingSchema) body: { score: number; comment?: string },
  ) {
    return this.trackingService.submitPublicRating(token, body.score, body.comment);
  }
}
