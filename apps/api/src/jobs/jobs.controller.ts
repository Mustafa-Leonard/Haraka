import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '@haraka/shared-types';
import {
  createJobSchema,
  cancelJobSchema,
  verifyPickupSchema,
  verifyDeliverySchema,
  paginationSchema,
  type CreateJobDto,
  type VerifyPickupDto,
  type VerifyDeliveryDto,
} from '@haraka/validation';
import { ZodBody } from '../common/decorators/zod-body.decorator';

@ApiTags('jobs')
@Controller()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('merchant/jobs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create new delivery booking from quote' })
  async createJob(
    @CurrentUser() user: AuthUser,
    @ZodBody(createJobSchema) body: CreateJobDto,
  ) {
    const job = await this.jobsService.createJob(user.id, body as any);
    return { data: job };
  }

  @Get('merchant/jobs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List merchant deliveries' })
  async getMerchantJobs(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.jobsService.getMerchantJobs(user.id, p, l);
  }

  @Get('merchant/jobs/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get merchant delivery detail' })
  async getJobDetail(
    @CurrentUser() user: AuthUser,
    @Param('id') jobId: string,
  ) {
    const job = await this.jobsService.getJobDetail(jobId, user.id);
    return { data: job };
  }

  @Post('merchant/jobs/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cancel pending delivery' })
  async cancelJob(
    @CurrentUser() user: AuthUser,
    @Param('id') jobId: string,
    @ZodBody(cancelJobSchema) body: { reason?: string },
  ) {
    const job = await this.jobsService.cancelJob(jobId, user.id, body.reason);
    return { data: job };
  }

  // --- Rider Endpoints ---

  @Post('rider/jobs/:id/arrive-pickup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rider signals arrival at pickup' })
  async arrivePickup(
    @CurrentUser() user: AuthUser,
    @Param('id') jobId: string,
  ) {
    const job = await this.jobsService.transitionState(jobId, 'ARRIVED_PICKUP', user.id, 'Rider arrived at pickup');
    return { data: job };
  }

  @Post('rider/jobs/:id/pickup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rider verifies pickup PIN and takes custody of parcel' })
  async verifyPickup(
    @CurrentUser() user: AuthUser,
    @Param('id') jobId: string,
    @ZodBody(verifyPickupSchema) body: VerifyPickupDto,
  ) {
    const job = await this.jobsService.verifyPickupPin(jobId, user.id, body.pin);
    return { data: job };
  }

  @Post('rider/jobs/:id/arrive-dropoff')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rider signals arrival at dropoff' })
  async arriveDropoff(
    @CurrentUser() user: AuthUser,
    @Param('id') jobId: string,
  ) {
    const job = await this.jobsService.transitionState(jobId, 'ARRIVED_DROPOFF', user.id, 'Rider arrived at dropoff');
    return { data: job };
  }

  @Post('rider/jobs/:id/deliver')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rider verifies recipient delivery PIN to complete delivery' })
  async verifyDelivery(
    @CurrentUser() user: AuthUser,
    @Param('id') jobId: string,
    @ZodBody(verifyDeliverySchema) body: VerifyDeliveryDto,
  ) {
    const job = await this.jobsService.verifyDeliveryPin(jobId, user.id, body.pin);
    return { data: job };
  }
}
