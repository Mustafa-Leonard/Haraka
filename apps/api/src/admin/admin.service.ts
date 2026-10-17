import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Dashboard ─────────────────────────────────────────────────────────────

  async getDashboard() {
    const [totalUsers, activeRiders, totalJobs, activeJobs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.rider.count({ where: { onlineStatus: { in: ['ONLINE', 'ON_JOB'] } } }),
      this.prisma.job.count(),
      this.prisma.job.count({
        where: {
          status: {
            in: [
              'REQUESTED', 'MATCHING', 'OFFERED', 'ACCEPTED',
              'ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DROPOFF',
            ],
          },
        },
      }),
    ]);
    return { totalUsers, activeRiders, totalJobs, activeJobs, systemStatus: 'HEALTHY' };
  }

  // ── Fleet ─────────────────────────────────────────────────────────────────

  async getFleet() {
    const riders = await this.prisma.rider.findMany({
      where: { verificationStatus: 'APPROVED' },
      include: {
        user: true,
        locationState: true,
        vehicles: { include: { vehicle: true } },
      },
    });
    return riders.map((r) => ({
      id: r.id,
      name: r.user.displayName,
      phone: r.user.phone,
      status: r.onlineStatus,
      lat: r.locationState?.latitude ? Number(r.locationState.latitude) : -3.6305,
      lng: r.locationState?.longitude ? Number(r.locationState.longitude) : 39.8499,
      vehicle: r.vehicles?.[0]?.vehicle?.plateNumber ?? null,
    }));
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────

  async getJobs(page: number, limit: number, status?: string) {
    const where = status ? { status: status as any } : {};
    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { merchant: { include: { user: true } } },
      }),
      this.prisma.job.count({ where }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
      data: data.map((j) => ({
        id: j.id,
        referenceCode: j.referenceCode,
        status: j.status,
        pickupTown: j.pickupTown,
        dropoffTown: j.dropoffTown,
        recipientName: j.recipientName,
        vehicleType: j.vehicleType,
        quotedAmount: j.quotedAmount,
        currency: j.currency,
        paymentMethod: j.paymentMethod,
        createdAt: j.createdAt,
        estimatedDeliveryAt: j.estimatedDeliveryAt,
      })),
      meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  async assignJob(jobId: string, riderId: string, adminUserId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const rider = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');
    if (rider.verificationStatus !== 'APPROVED') {
      throw new BadRequestException('Rider is not approved');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const j = await tx.job.update({
        where: { id: jobId },
        data: { riderId, status: 'ACCEPTED' as any },
      });
      await tx.jobEvent.create({
        data: {
          jobId,
          fromStatus: job.status as any,
          toStatus: 'ACCEPTED' as any,
          reason: `Manual assignment by dispatcher`,
          actorId: adminUserId,
        },
      });
      return j;
    });

    await this.audit.log({
      actorId: adminUserId,
      action: 'JOB_ASSIGN',
      resource: 'jobs',
      resourceId: jobId,
      outcome: 'success',
    });

    return updated;
  }

  async cancelJob(jobId: string, adminUserId: string, reason: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const j = await tx.job.update({
        where: { id: jobId },
        data: { status: 'CANCELLED' as any, cancellationNote: reason },
      });
      await tx.jobEvent.create({
        data: {
          jobId,
          fromStatus: job.status as any,
          toStatus: 'CANCELLED' as any,
          reason,
          actorId: adminUserId,
        },
      });
      return j;
    });

    await this.audit.log({
      actorId: adminUserId,
      action: 'JOB_CANCEL',
      resource: 'jobs',
      resourceId: jobId,
      outcome: 'success',
    });

    return updated;
  }

  // ── Riders ────────────────────────────────────────────────────────────────

  async getRiders(verificationStatus?: string) {
    const where = verificationStatus ? { verificationStatus: verificationStatus as any } : {};
    const riders = await this.prisma.rider.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        vehicles: { include: { vehicle: true } },
      },
    });
    return riders.map((r) => ({
      id: r.id,
      userId: r.userId,
      displayName: r.user.displayName,
      phone: r.user.phone,
      avatarUrl: r.user.avatarUrl,
      verificationStatus: r.verificationStatus,
      onlineStatus: r.onlineStatus,
      averageRating: r.averageRating ? Number(r.averageRating) : null,
      ratingCount: r.ratingCount,
      totalDeliveries: r.totalDeliveries,
      primaryVehicle: r.vehicles?.[0]?.vehicle
        ? {
            id: r.vehicles[0].vehicle.id,
            type: r.vehicles[0].vehicle.type,
            plateNumber: r.vehicles[0].vehicle.plateNumber,
          }
        : null,
      createdAt: r.createdAt,
    }));
  }

  async approveRider(riderId: string, adminUserId: string) {
    const rider = await this.prisma.rider.update({
      where: { id: riderId },
      data: {
        verificationStatus: 'APPROVED',
        verifiedAt: new Date(),
        verifiedBy: adminUserId,
      },
    });
    await this.audit.log({
      actorId: adminUserId,
      action: 'RIDER_APPROVE',
      resource: 'riders',
      resourceId: riderId,
      outcome: 'success',
    });
    return rider;
  }

  async suspendRider(riderId: string, adminUserId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Suspension reason is required');
    const rider = await this.prisma.rider.update({
      where: { id: riderId },
      data: { verificationStatus: 'SUSPENDED', onlineStatus: 'OFFLINE' },
    });
    await this.audit.log({
      actorId: adminUserId,
      action: 'RIDER_SUSPEND',
      resource: 'riders',
      resourceId: riderId,
      outcome: 'success',
      failReason: reason,
    });
    return rider;
  }

  // ── Pricing ───────────────────────────────────────────────────────────────

  async getPricingRules() {
    const rules = await this.prisma.pricingRule.findMany({
      where: { isActive: true },
      include: { zone: true, parcelMultipliers: true },
      orderBy: [{ vehicleType: 'asc' }, { version: 'desc' }],
    });
    return rules.map((r) => ({
      id: r.id,
      zoneId: r.zoneId,
      zoneName: r.zone?.name ?? null,
      vehicleType: r.vehicleType,
      baseFare: r.baseFare,
      perKmRate: r.perKmRate,
      minimumFare: r.minimumFare,
      parcelMultipliers: r.parcelMultipliers.map((pm) => ({
        parcelSize: pm.parcelSize,
        multiplier: Number(pm.multiplier),
      })),
      isActive: r.isActive,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
      version: r.version,
    }));
  }

  async updatePricingRule(ruleId: string, payload: Record<string, unknown>, adminUserId: string) {
    const existing = await this.prisma.pricingRule.findUnique({ where: { id: ruleId } });
    if (!existing) throw new NotFoundException('Pricing rule not found');

    // Create new version; deactivate old
    const [, newRule] = await this.prisma.$transaction([
      this.prisma.pricingRule.update({
        where: { id: ruleId },
        data: { isActive: false, effectiveTo: new Date() },
      }),
      this.prisma.pricingRule.create({
        data: {
          zoneId: existing.zoneId,
          vehicleType: existing.vehicleType,
          baseFare: typeof payload.baseFare === 'number' ? payload.baseFare : existing.baseFare,
          perKmRate: typeof payload.perKmRate === 'number' ? payload.perKmRate : existing.perKmRate,
          minimumFare: typeof payload.minimumFare === 'number' ? payload.minimumFare : existing.minimumFare,
          version: existing.version + 1,
          isActive: true,
          effectiveFrom: new Date(),
          notes: typeof payload.notes === 'string' ? payload.notes : null,
        },
      }),
    ]);

    await this.audit.log({
      actorId: adminUserId,
      action: 'PRICING_UPDATE',
      resource: 'pricing_rules',
      resourceId: newRule.id,
      outcome: 'success',
    });

    return newRule;
  }

  async getServiceZones() {
    return this.prisma.serviceZone.findMany({ orderBy: { name: 'asc' } });
  }

  async createServiceZone(
    body: { name: string; slug: string; description?: string },
    adminUserId: string,
  ) {
    const existing = await this.prisma.serviceZone.findUnique({ where: { slug: body.slug } });
    if (existing) throw new BadRequestException('A zone with this slug already exists');

    const zone = await this.prisma.serviceZone.create({
      data: { name: body.name, slug: body.slug, description: body.description ?? null, isActive: true },
    });

    await this.audit.log({
      actorId: adminUserId,
      action: 'ZONE_CREATE',
      resource: 'service_zones',
      resourceId: zone.id,
      outcome: 'success',
    });

    return zone;
  }

  // ── Ledger ────────────────────────────────────────────────────────────────

  async getLedgerSummary(period: string) {
    const accounts = await this.prisma.ledgerAccount.findMany({ orderBy: { code: 'asc' } });

    const dateFrom = this._periodStart(period);
    const balances = await Promise.all(
      accounts.map(async (acc) => {
        const entries = await this.prisma.ledgerEntry.findMany({
          where: {
            accountId: acc.id,
            ...(dateFrom ? { transaction: { createdAt: { gte: dateFrom } } } : {}),
          },
          include: { transaction: true },
        });
        const balance = entries.reduce((sum, e) => {
          return sum + (e.side === 'DEBIT' ? e.amount : -e.amount);
        }, 0);
        return {
          accountCode: acc.code,
          accountName: acc.name,
          balance,
          currency: acc.currency,
        };
      }),
    );

    return { accounts: balances };
  }

  async getLedgerTransactions(page: number, limit: number, period?: string) {
    const dateFrom = period ? this._periodStart(period) : null;
    const where = dateFrom ? { createdAt: { gte: dateFrom } } : {};

    const [txs, total] = await Promise.all([
      this.prisma.ledgerTransaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { entries: true },
      }),
      this.prisma.ledgerTransaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: txs.map((tx) => {
        const debits = tx.entries.filter((e) => e.side === 'DEBIT');
        const credits = tx.entries.filter((e) => e.side === 'CREDIT');
        const totalDebit = debits.reduce((s, e) => s + e.amount, 0);
        const totalCredit = credits.reduce((s, e) => s + e.amount, 0);
        return {
          id: tx.id,
          description: tx.description,
          jobRef: tx.jobId ?? null,
          totalDebit,
          totalCredit,
          isBalanced: totalDebit === totalCredit,
          createdAt: tx.createdAt,
        };
      }),
      meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  // ── Disputes ──────────────────────────────────────────────────────────────

  async getDisputes(status?: string) {
    const where = status ? { status: status as any } : {};
    const disputes = await this.prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { job: true, filer: true },
    });
    return disputes.map((d) => ({
      id: d.id,
      jobId: d.jobId,
      jobReferenceCode: d.job?.referenceCode ?? null,
      status: d.status,
      category: d.category,
      description: d.description,
      filedBy: d.filer?.displayName ?? null,
      resolutionNote: d.resolutionNote,
      createdAt: d.createdAt,
    }));
  }

  async getDispute(id: string) {
    const d = await this.prisma.dispute.findUnique({
      where: { id },
      include: { job: true, filer: true },
    });
    if (!d) throw new NotFoundException('Dispute not found');
    return {
      id: d.id,
      jobId: d.jobId,
      jobReferenceCode: d.job?.referenceCode ?? null,
      status: d.status,
      category: d.category,
      description: d.description,
      filedBy: d.filer?.displayName ?? null,
      resolutionNote: d.resolutionNote,
      createdAt: d.createdAt,
    };
  }

  async resolveDispute(id: string, resolutionNote: string, adminUserId: string) {
    if (!resolutionNote?.trim()) throw new BadRequestException('Resolution note is required');
    const dispute = await this.prisma.dispute.update({
      where: { id },
      data: { status: 'RESOLVED', resolutionNote, resolvedAt: new Date(), resolvedBy: adminUserId },
    });
    await this.audit.log({
      actorId: adminUserId,
      action: 'DISPUTE_RESOLVE',
      resource: 'disputes',
      resourceId: id,
      outcome: 'success',
    });
    return dispute;
  }

  async escalateDispute(id: string, adminUserId: string) {
    const dispute = await this.prisma.dispute.update({
      where: { id },
      data: { status: 'ESCALATED' },
    });
    await this.audit.log({
      actorId: adminUserId,
      action: 'DISPUTE_ESCALATE',
      resource: 'disputes',
      resourceId: id,
      outcome: 'success',
    });
    return dispute;
  }

  // ── Audit Logs ────────────────────────────────────────────────────────────

  async getAuditLogs(page: number, limit: number, action?: string, outcome?: string) {
    const where: any = {};
    if (action) where.action = action;
    if (outcome) where.outcome = outcome;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data,
      meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _periodStart(period: string): Date | null {
    const now = new Date();
    switch (period) {
      case 'TODAY': {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      case 'WTD': {
        const d = new Date(now);
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        return d;
      }
      case 'MTD': {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        return d;
      }
      case 'YTD': {
        return new Date(now.getFullYear(), 0, 1);
      }
      default:
        return null;
    }
  }
}
