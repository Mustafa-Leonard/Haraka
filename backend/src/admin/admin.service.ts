import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreatePricingRuleDto, UpdatePricingRuleDto } from '@haraka/validation';
import type { Prisma } from '@haraka/database';

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
              'REQUESTED',
              'MATCHING',
              'OFFERED',
              'ACCEPTED',
              'ARRIVED_PICKUP',
              'PICKED_UP',
              'IN_TRANSIT',
              'ARRIVED_DROPOFF',
            ],
          },
        },
      }),
    ]);
    return { totalUsers, activeRiders, totalJobs, activeJobs };
  }

  // ── Fleet ─────────────────────────────────────────────────────────────────

  async getFleet() {
    const riders = await this.prisma.rider.findMany({
      where: {
        verificationStatus: 'APPROVED',
        onlineStatus: { in: ['ONLINE', 'ON_JOB'] },
        deletedAt: null,
      },
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
      lat: r.locationState?.latitude == null ? null : Number(r.locationState.latitude),
      lng: r.locationState?.longitude == null ? null : Number(r.locationState.longitude),
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
      await tx.jobStateHistory.create({
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
      await tx.jobStateHistory.create({
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
    const rider = await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.rider.findUnique({ where: { id: riderId } });
      if (!existing) throw new NotFoundException('Rider not found');
      if (!['PENDING', 'UNDER_REVIEW'].includes(existing.verificationStatus)) {
        throw new BadRequestException('Only pending or under-review riders can be approved');
      }

      const transition = await transaction.rider.updateMany({
        where: {
          id: riderId,
          verificationStatus: { in: ['PENDING', 'UNDER_REVIEW'] },
        },
        data: {
          verificationStatus: 'APPROVED',
          verifiedAt: new Date(),
          verifiedBy: adminUserId,
        },
      });
      if (transition.count !== 1) {
        throw new BadRequestException('Rider verification status changed; refresh and try again');
      }
      const approvedRider = await transaction.rider.findUniqueOrThrow({ where: { id: riderId } });
      await transaction.riderVerificationEvent.create({
        data: {
          riderId,
          actorId: adminUserId,
          fromStatus: existing.verificationStatus,
          toStatus: 'APPROVED',
        },
      });
      return approvedRider;
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

  async rejectRider(riderId: string, adminUserId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Rejection reason is required');
    const updated = await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.rider.findUnique({ where: { id: riderId } });
      if (!existing) throw new NotFoundException('Rider not found');
      if (!['PENDING', 'UNDER_REVIEW'].includes(existing.verificationStatus)) {
        throw new BadRequestException(
          'Only pending or under-review rider applications can be rejected',
        );
      }

      const transition = await transaction.rider.updateMany({
        where: {
          id: riderId,
          verificationStatus: { in: ['PENDING', 'UNDER_REVIEW'] },
        },
        data: { verificationStatus: 'REJECTED' },
      });
      if (transition.count !== 1) {
        throw new BadRequestException('Rider verification status changed; refresh and try again');
      }
      const rider = await transaction.rider.findUniqueOrThrow({ where: { id: riderId } });
      await transaction.riderVerificationEvent.create({
        data: {
          riderId,
          actorId: adminUserId,
          fromStatus: existing.verificationStatus,
          toStatus: 'REJECTED',
          reason: reason.trim(),
        },
      });
      return rider;
    });

    await this.audit.log({
      actorId: adminUserId,
      action: 'RIDER_REJECT',
      resource: 'riders',
      resourceId: riderId,
      newValue: { verificationStatus: 'REJECTED', reason: reason.trim() },
      outcome: 'success',
    });
    return updated;
  }

  async reactivateRider(riderId: string, adminUserId: string) {
    const existing = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!existing) throw new NotFoundException('Rider not found');
    if (existing.verificationStatus !== 'SUSPENDED') {
      throw new BadRequestException('Only suspended riders can be reactivated');
    }

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
    return rules.map((rule) => this.mapPricingRule(rule));
  }

  private mapPricingRule(
    rule: Prisma.PricingRuleGetPayload<{
      include: { zone: true; parcelMultipliers: true };
    }>,
  ) {
    return {
      id: rule.id,
      zoneId: rule.zoneId,
      zoneName: rule.zone?.name ?? null,
      vehicleType: rule.vehicleType,
      baseFare: rule.baseFare,
      perKmRate: rule.perKmRate,
      minimumFare: rule.minimumFare,
      riderShareBps: rule.riderShareBps,
      parcelMultipliers: rule.parcelMultipliers.map((pm) => ({
        parcelSize: pm.parcelSize,
        multiplier: Number(pm.multiplier),
      })),
      isActive: rule.isActive,
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo,
      version: rule.version,
    };
  }

  async updatePricingRule(ruleId: string, payload: UpdatePricingRuleDto, adminUserId: string) {
    const existing = await this.prisma.pricingRule.findUnique({
      where: { id: ruleId },
      include: { parcelMultipliers: true },
    });
    if (!existing) throw new NotFoundException('Pricing rule not found');

    const newRule = await this.prisma.$transaction(async (tx) => {
      await tx.pricingRule.update({
        where: { id: ruleId },
        data: { isActive: false, effectiveTo: new Date() },
      });
      return tx.pricingRule.create({
        data: {
          zoneId: existing.zoneId,
          vehicleType: existing.vehicleType,
          riderShareBps: payload.riderShareBps ?? existing.riderShareBps,
          baseFare: payload.baseFare ?? existing.baseFare,
          perKmRate: payload.perKmRate ?? existing.perKmRate,
          minimumFare: payload.minimumFare ?? existing.minimumFare,
          version: existing.version + 1,
          isActive: true,
          effectiveFrom: new Date(),
          createdBy: adminUserId,
          notes: payload.notes ?? existing.notes,
          parcelMultipliers: {
            create: existing.parcelMultipliers.map((item) => ({
              parcelSize: item.parcelSize,
              multiplier: item.multiplier,
            })),
          },
        },
        include: { zone: true, parcelMultipliers: true },
      });
    });

    await this.audit.log({
      actorId: adminUserId,
      action: 'PRICING_UPDATE',
      resource: 'pricing_rules',
      resourceId: newRule.id,
      outcome: 'success',
    });

    return this.mapPricingRule(newRule);
  }

  async createPricingRule(payload: CreatePricingRuleDto, adminUserId: string) {
    const zone = await this.prisma.serviceZone.findFirst({
      where: { id: payload.zoneId, isActive: true },
    });
    if (!zone) throw new NotFoundException('Active service zone not found');

    const activeRule = await this.prisma.pricingRule.findFirst({
      where: { zoneId: zone.id, vehicleType: payload.vehicleType, isActive: true },
    });
    if (activeRule) {
      throw new BadRequestException(
        'An active pricing rule already exists for this vehicle and service zone.',
      );
    }

    const sourceRule = await this.prisma.pricingRule.findFirst({
      where: { vehicleType: payload.vehicleType, isActive: true },
      include: { parcelMultipliers: true },
      orderBy: { version: 'desc' },
    });
    const rule = await this.prisma.pricingRule.create({
      data: {
        zoneId: zone.id,
        vehicleType: payload.vehicleType,
        baseFare: payload.baseFare,
        perKmRate: payload.perKmRate,
        minimumFare: payload.minimumFare,
        riderShareBps: payload.riderShareBps,
        version: 1,
        createdBy: adminUserId,
        notes: payload.notes,
        parcelMultipliers: {
          create:
            payload.parcelMultipliers?.map((item) => ({
              parcelSize: item.parcelSize,
              multiplier: item.multiplier,
            })) ??
            sourceRule?.parcelMultipliers.map((item) => ({
              parcelSize: item.parcelSize,
              multiplier: item.multiplier,
            })),
        },
      },
      include: { zone: true, parcelMultipliers: true },
    });

    await this.audit.log({
      actorId: adminUserId,
      action: 'PRICING_UPDATE',
      resource: 'pricing_rules',
      resourceId: rule.id,
      outcome: 'success',
    });
    return this.mapPricingRule(rule);
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
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description ?? null,
        isActive: true,
      },
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
        const [debitSum, creditSum] = await Promise.all([
          this.prisma.ledgerEntry.aggregate({
            _sum: { amount: true },
            where: {
              debitAccountId: acc.id,
              ...(dateFrom ? { transaction: { postedAt: { gte: dateFrom } } } : {}),
            },
          }),
          this.prisma.ledgerEntry.aggregate({
            _sum: { amount: true },
            where: {
              creditAccountId: acc.id,
              ...(dateFrom ? { transaction: { postedAt: { gte: dateFrom } } } : {}),
            },
          }),
        ]);
        const balance = (debitSum._sum.amount ?? 0) - (creditSum._sum.amount ?? 0);
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
    const where = dateFrom ? { postedAt: { gte: dateFrom } } : {};

    const [txs, total] = await Promise.all([
      this.prisma.ledgerTransaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { postedAt: 'desc' },
        include: { entries: true },
      }),
      this.prisma.ledgerTransaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: txs.map((tx) => {
        const totalDebit = tx.entries.reduce((s, e) => s + e.amount, 0);
        const totalCredit = tx.entries.reduce((s, e) => s + e.amount, 0);
        return {
          id: tx.id,
          description: tx.description,
          jobRef: tx.paymentId ?? null,
          totalDebit,
          totalCredit,
          isBalanced: true,
          createdAt: tx.postedAt,
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
      include: { job: true },
    });
    return disputes.map((d) => ({
      id: d.id,
      jobId: d.jobId,
      jobReferenceCode: d.job?.referenceCode ?? null,
      status: d.status,
      category: d.category,
      description: d.description,
      filedBy: d.reporterRole,
      resolutionNote: d.resolutionNote,
      createdAt: d.createdAt,
    }));
  }

  async getDispute(id: string) {
    const d = await this.prisma.dispute.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!d) throw new NotFoundException('Dispute not found');
    return {
      id: d.id,
      jobId: d.jobId,
      jobReferenceCode: d.job?.referenceCode ?? null,
      status: d.status,
      category: d.category,
      description: d.description,
      filedBy: d.reporterRole,
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
