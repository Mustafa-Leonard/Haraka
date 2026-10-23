import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '@haraka/shared-types';
import {
  createPricingRuleSchema,
  updatePricingRuleSchema,
  riderVerificationRejectionSchema,
  type CreatePricingRuleDto,
  type UpdatePricingRuleDto,
} from '@haraka/validation';
import { ZodBody } from '../common/decorators/zod-body.decorator';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard & Fleet ─────────────────────────────────────────────────────

  @Get('dashboard')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Operations overview dashboard' })
  async getDashboard() {
    return { data: await this.adminService.getDashboard() };
  }

  @Get('fleet')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Real-time fleet positions' })
  async getFleet() {
    return { data: await this.adminService.getFleet() };
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────

  @Get('jobs')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DISPATCHER', 'SUPPORT')
  @ApiOperation({ summary: 'List all jobs with optional status filter' })
  async getJobs(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.adminService.getJobs(parseInt(page), parseInt(limit), status);
  }

  @Post('jobs/:id/assign')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Manually assign a job to a rider' })
  async assignJob(
    @CurrentUser() user: AuthUser,
    @Param('id') jobId: string,
    @Body('riderId') riderId: string,
  ) {
    return { data: await this.adminService.assignJob(jobId, riderId, user.id) };
  }

  @Post('jobs/:id/cancel')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Admin force-cancel a job' })
  async cancelJob(
    @CurrentUser() user: AuthUser,
    @Param('id') jobId: string,
    @Body('reason') reason: string,
  ) {
    return { data: await this.adminService.cancelJob(jobId, user.id, reason) };
  }

  // ── Riders ────────────────────────────────────────────────────────────────

  @Get('riders')
  @Roles('ADMIN', 'SUPER_ADMIN', 'VERIFICATION_OFFICER')
  @ApiOperation({ summary: 'List riders filtered by verification status' })
  async getRiders(@Query('verificationStatus') status?: string) {
    return { data: await this.adminService.getRiders(status) };
  }

  @Post('riders/:id/approve')
  @Roles('ADMIN', 'SUPER_ADMIN', 'VERIFICATION_OFFICER')
  @ApiOperation({ summary: 'Approve a rider application' })
  async approveRider(@CurrentUser() user: AuthUser, @Param('id') riderId: string) {
    return { data: await this.adminService.approveRider(riderId, user.id) };
  }

  @Post('riders/:id/reject')
  @Roles('ADMIN', 'SUPER_ADMIN', 'VERIFICATION_OFFICER')
  @ApiOperation({ summary: 'Reject a pending rider application with a reason' })
  async rejectRider(
    @CurrentUser() user: AuthUser,
    @Param('id') riderId: string,
    @ZodBody(riderVerificationRejectionSchema) body: { reason: string },
  ) {
    return { data: await this.adminService.rejectRider(riderId, user.id, body.reason) };
  }

  @Post('riders/:id/reactivate')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Reactivate a suspended rider' })
  async reactivateRider(@CurrentUser() user: AuthUser, @Param('id') riderId: string) {
    return { data: await this.adminService.reactivateRider(riderId, user.id) };
  }

  @Post('riders/:id/suspend')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Suspend a rider' })
  async suspendRider(
    @CurrentUser() user: AuthUser,
    @Param('id') riderId: string,
    @Body('reason') reason: string,
  ) {
    return { data: await this.adminService.suspendRider(riderId, user.id, reason) };
  }

  // ── Pricing ───────────────────────────────────────────────────────────────

  @Get('pricing/rules')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List all active pricing rules' })
  async getPricingRules() {
    return { data: await this.adminService.getPricingRules() };
  }

  @Post('pricing/rules')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a vehicle pricing rule for an active service zone' })
  async createPricingRule(
    @CurrentUser() user: AuthUser,
    @ZodBody(createPricingRuleSchema) payload: CreatePricingRuleDto,
  ) {
    return { data: await this.adminService.createPricingRule(payload, user.id) };
  }

  @Patch('pricing/rules/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update a pricing rule (new version created)' })
  async updatePricingRule(
    @CurrentUser() user: AuthUser,
    @Param('id') ruleId: string,
    @ZodBody(updatePricingRuleSchema) payload: UpdatePricingRuleDto,
  ) {
    return { data: await this.adminService.updatePricingRule(ruleId, payload, user.id) };
  }

  @Get('pricing/zones')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List service zones' })
  async getServiceZones() {
    return { data: await this.adminService.getServiceZones() };
  }

  @Post('pricing/zones')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new service zone' })
  async createServiceZone(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; slug: string; description?: string },
  ) {
    return { data: await this.adminService.createServiceZone(body, user.id) };
  }

  // ── Ledger ────────────────────────────────────────────────────────────────

  @Get('ledger/summary')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE')
  @ApiOperation({ summary: 'Chart of accounts with computed balances' })
  async getLedgerSummary(@Query('period') period = 'MTD') {
    return { data: await this.adminService.getLedgerSummary(period) };
  }

  @Get('ledger/transactions')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FINANCE')
  @ApiOperation({ summary: 'Paginated ledger transactions' })
  async getLedgerTransactions(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('period') period?: string,
  ) {
    return this.adminService.getLedgerTransactions(parseInt(page), parseInt(limit), period);
  }

  // ── Disputes ──────────────────────────────────────────────────────────────

  @Get('disputes')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DISPATCHER', 'SUPPORT')
  @ApiOperation({ summary: 'List disputes' })
  async getDisputes(@Query('status') status?: string) {
    return { data: await this.adminService.getDisputes(status) };
  }

  @Get('disputes/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DISPATCHER', 'SUPPORT')
  @ApiOperation({ summary: 'Get dispute detail' })
  async getDispute(@Param('id') id: string) {
    return { data: await this.adminService.getDispute(id) };
  }

  @Post('disputes/:id/resolve')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Resolve a dispute' })
  async resolveDispute(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('resolutionNote') resolutionNote: string,
  ) {
    return { data: await this.adminService.resolveDispute(id, resolutionNote, user.id) };
  }

  @Post('disputes/:id/escalate')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DISPATCHER', 'SUPPORT')
  @ApiOperation({ summary: 'Escalate a dispute' })
  async escalateDispute(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return { data: await this.adminService.escalateDispute(id, user.id) };
  }

  // ── Audit Logs ────────────────────────────────────────────────────────────

  @Get('audit-logs')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Paginated immutable security audit log' })
  async getAuditLogs(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('action') action?: string,
    @Query('outcome') outcome?: string,
  ) {
    return this.adminService.getAuditLogs(parseInt(page), parseInt(limit), action, outcome);
  }
}
