import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '@haraka/shared-types';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN', 'DISPATCHER')
@ApiBearerAuth('access-token')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard & Fleet ─────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Operations overview dashboard' })
  async getDashboard() {
    return { data: await this.adminService.getDashboard() };
  }

  @Get('fleet')
  @ApiOperation({ summary: 'Real-time fleet positions' })
  async getFleet() {
    return { data: await this.adminService.getFleet() };
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────

  @Get('jobs')
  @ApiOperation({ summary: 'List all jobs with optional status filter' })
  async getJobs(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.adminService.getJobs(parseInt(page), parseInt(limit), status);
  }

  @Post('jobs/:id/assign')
  @ApiOperation({ summary: 'Manually assign a job to a rider' })
  async assignJob(
    @CurrentUser() user: AuthUser,
    @Param('id') jobId: string,
    @Body('riderId') riderId: string,
  ) {
    return { data: await this.adminService.assignJob(jobId, riderId, user.id) };
  }

  @Post('jobs/:id/cancel')
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
  @ApiOperation({ summary: 'List riders filtered by verification status' })
  async getRiders(@Query('verificationStatus') status?: string) {
    return { data: await this.adminService.getRiders(status) };
  }

  @Post('riders/:id/approve')
  @ApiOperation({ summary: 'Approve a rider application' })
  async approveRider(
    @CurrentUser() user: AuthUser,
    @Param('id') riderId: string,
  ) {
    return { data: await this.adminService.approveRider(riderId, user.id) };
  }

  @Post('riders/:id/suspend')
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
  @ApiOperation({ summary: 'List all active pricing rules' })
  async getPricingRules() {
    return { data: await this.adminService.getPricingRules() };
  }

  @Patch('pricing/rules/:id')
  @ApiOperation({ summary: 'Update a pricing rule (new version created)' })
  async updatePricingRule(
    @CurrentUser() user: AuthUser,
    @Param('id') ruleId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return { data: await this.adminService.updatePricingRule(ruleId, payload, user.id) };
  }

  @Get('pricing/zones')
  @ApiOperation({ summary: 'List service zones' })
  async getServiceZones() {
    return { data: await this.adminService.getServiceZones() };
  }

  @Post('pricing/zones')
  @ApiOperation({ summary: 'Create a new service zone' })
  async createServiceZone(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; slug: string; description?: string },
  ) {
    return { data: await this.adminService.createServiceZone(body, user.id) };
  }

  // ── Ledger ────────────────────────────────────────────────────────────────

  @Get('ledger/summary')
  @ApiOperation({ summary: 'Chart of accounts with computed balances' })
  async getLedgerSummary(@Query('period') period = 'MTD') {
    return { data: await this.adminService.getLedgerSummary(period) };
  }

  @Get('ledger/transactions')
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
  @ApiOperation({ summary: 'List disputes' })
  async getDisputes(@Query('status') status?: string) {
    return { data: await this.adminService.getDisputes(status) };
  }

  @Get('disputes/:id')
  @ApiOperation({ summary: 'Get dispute detail' })
  async getDispute(@Param('id') id: string) {
    return { data: await this.adminService.getDispute(id) };
  }

  @Post('disputes/:id/resolve')
  @ApiOperation({ summary: 'Resolve a dispute' })
  async resolveDispute(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('resolutionNote') resolutionNote: string,
  ) {
    return { data: await this.adminService.resolveDispute(id, resolutionNote, user.id) };
  }

  @Post('disputes/:id/escalate')
  @ApiOperation({ summary: 'Escalate a dispute' })
  async escalateDispute(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return { data: await this.adminService.escalateDispute(id, user.id) };
  }

  // ── Audit Logs ────────────────────────────────────────────────────────────

  @Get('audit-logs')
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
