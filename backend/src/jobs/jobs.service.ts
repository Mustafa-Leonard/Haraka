import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/database/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { JobStateMachineService } from './job-state-machine.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { buildFareSplitEntries } from '../ledger/fare-entries';
import { calculateRiderShareAmount } from '../ledger/rider-share';
import type { CreateJobDto, JobDetailDto, JobSummaryDto, JobStatus } from '@haraka/shared-types';
import { randomBytes, randomInt } from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly stateMachine: JobStateMachineService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly ledger: LedgerService,
  ) {}

  async createJob(merchantUserId: string, dto: CreateJobDto): Promise<JobDetailDto> {
    if (dto.paymentMethod === 'WALLET') {
      throw new ConflictException('Wallet payments are not available for new bookings.');
    }
    const merchant = await this.prisma.merchant.findUnique({ where: { userId: merchantUserId } });
    if (!merchant) throw new NotFoundException('Merchant profile not found');

    const quote = await this.pricingService.getValidQuote(dto.quoteId, merchant.id);
    if (quote.zoneId === null || quote.riderShareBps === null) {
      throw new ConflictException(
        'This quote has no active zone or rider compensation snapshot. Request a new quote.',
      );
    }
    const quoteCoordinates = [
      Number(quote.pickupLat),
      Number(quote.pickupLng),
      Number(quote.dropoffLat),
      Number(quote.dropoffLng),
    ];
    const bookingCoordinates = [dto.pickupLat, dto.pickupLng, dto.dropoffLat, dto.dropoffLng];
    if (
      quoteCoordinates.some(
        (coordinate, index) => Math.abs(coordinate - bookingCoordinates[index]) > 0.0000001,
      ) ||
      quote.vehicleType !== dto.vehicleType ||
      quote.parcelSize !== dto.parcelSize
    ) {
      throw new ConflictException(
        'Route, vehicle, or parcel details changed after quoting. Request a new quote.',
      );
    }

    // 3. Generate reference code and confidential PINs
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = randomBytes(3).toString('hex').toUpperCase();
    const referenceCode = `HRK-${dateStr}-${randCode}`;

    // 4-digit numeric PINs
    const pickupPin = String(randomInt(1000, 9999));
    const deliveryPin = String(randomInt(1000, 9999));

    const pickupPinHash = await argon2.hash(pickupPin, { type: argon2.argon2id });
    const deliveryPinHash = await argon2.hash(deliveryPin, { type: argon2.argon2id });

    // 4. Generate public tracking token
    const publicTrackingToken = randomBytes(24).toString('base64url');
    const trackingTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const job = await this.prisma.$transaction(async (tx) => {
      const claimedQuote = await tx.routeQuote.updateMany({
        where: {
          id: quote.id,
          merchantId: merchant.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (claimedQuote.count !== 1) {
        throw new ConflictException(
          'This quote has expired or has already been used. Request a new quote.',
        );
      }

      const createdJob = await tx.job.create({
        data: {
          referenceCode,
          merchantId: merchant.id,
          quoteId: quote.id,
          zoneId: quote.zoneId,
          pickupAddressId: dto.pickupAddressId,
          pickupStreet: dto.pickupStreet,
          pickupBuilding: dto.pickupBuilding,
          pickupArea: dto.pickupArea,
          pickupTown: dto.pickupTown,
          pickupInstructions: dto.pickupInstructions,
          pickupLat: dto.pickupLat,
          pickupLng: dto.pickupLng,
          dropoffAddressId: dto.dropoffAddressId,
          dropoffStreet: dto.dropoffStreet,
          dropoffBuilding: dto.dropoffBuilding,
          dropoffArea: dto.dropoffArea,
          dropoffTown: dto.dropoffTown,
          dropoffInstructions: dto.dropoffInstructions,
          dropoffLat: dto.dropoffLat,
          dropoffLng: dto.dropoffLng,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          vehicleType: quote.vehicleType,
          parcelSize: quote.parcelSize,
          parcelDescription: dto.parcelDescription,
          isFragile: dto.isFragile ?? false,
          quotedAmount: quote.totalAmount,
          riderShareBps: quote.riderShareBps,
          riderShareAmount:
            quote.riderShareBps === null
              ? null
              : calculateRiderShareAmount(quote.totalAmount, quote.riderShareBps),
          currency: 'KES',
          paymentMethod: dto.paymentMethod,
          distanceMeters: quote.distanceMeters,
          distanceSource: quote.distanceSource as any,
          status: 'REQUESTED',
          pickupPinHash,
          deliveryPinHash,
          publicTrackingToken,
          trackingTokenExpiresAt,
        },
      });

      await tx.jobStateHistory.create({
        data: {
          jobId: createdJob.id,
          actorId: merchantUserId,
          fromStatus: 'REQUESTED',
          toStatus: 'REQUESTED',
          reason: 'Booking created by merchant',
        },
      });
      return createdJob;
    });

    // 7. Send Merchant SMS with pickup PIN
    const merchantUser = await this.prisma.user.findUnique({ where: { id: merchantUserId } });
    if (merchantUser) {
      await this.notifications.sendBookingConfirmed(
        merchantUser.phone,
        job.referenceCode,
        pickupPin,
        merchantUser.preferredLanguage,
      );
    }
    await this.notifications.sendDeliveryPin(job.recipientPhone, job.referenceCode, deliveryPin);

    // 8. Trigger Automated Dispatch Matching
    this.eventEmitter.emit('job.created', { jobId: job.id });

    // Audit log
    await this.audit.log({
      actorId: merchantUserId,
      action: 'CREATE',
      resource: 'jobs',
      resourceId: job.id,
      outcome: 'success',
    });

    return this.mapToDetailDto(job, { pickupPin });
  }

  async transitionState(jobId: string, newStatus: JobStatus, actorId?: string, reason?: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    this.stateMachine.validateTransition(job.status as JobStatus, newStatus);

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: newStatus as any,
        version: { increment: 1 },
      },
    });

    await this.prisma.jobStateHistory.create({
      data: {
        jobId,
        actorId,
        fromStatus: job.status as any,
        toStatus: newStatus as any,
        reason,
      },
    });

    this.eventEmitter.emit('job.status_changed', {
      jobId,
      oldStatus: job.status,
      newStatus,
      riderId: job.riderId,
    });

    return updated;
  }

  async transitionRiderState(
    jobId: string,
    riderUserId: string,
    newStatus: JobStatus,
    reason: string,
  ) {
    const rider = await this.prisma.rider.findFirst({
      where: { userId: riderUserId, deletedAt: null },
      select: { id: true },
    });
    if (!rider) throw new NotFoundException('Job not found');

    const { updated, previousStatus } = await this.prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({ where: { id: jobId } });
      if (!job || job.riderId !== rider.id) throw new NotFoundException('Job not found');

      this.stateMachine.validateTransition(job.status as JobStatus, newStatus);
      const transition = await tx.job.updateMany({
        where: { id: jobId, riderId: rider.id, status: job.status },
        data: {
          status: newStatus as any,
          version: { increment: 1 },
        },
      });
      if (transition.count !== 1) {
        throw new ConflictException('Delivery status changed before this action completed.');
      }

      await tx.jobStateHistory.create({
        data: {
          jobId,
          actorId: riderUserId,
          fromStatus: job.status as any,
          toStatus: newStatus as any,
          reason,
        },
      });
      return {
        updated: await tx.job.findUniqueOrThrow({ where: { id: jobId } }),
        previousStatus: job.status,
      };
    });

    this.eventEmitter.emit('job.status_changed', {
      jobId,
      oldStatus: previousStatus,
      newStatus,
      riderId: rider.id,
    });
    return updated;
  }

  async verifyPickupPin(jobId: string, riderUserId: string, pin: string) {
    const [job, rider] = await Promise.all([
      this.prisma.job.findUnique({ where: { id: jobId } }),
      this.prisma.rider.findFirst({
        where: { userId: riderUserId, deletedAt: null },
        select: { id: true },
      }),
    ]);
    if (!job || !rider || job.riderId !== rider.id) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== 'ARRIVED_PICKUP') {
      throw new ConflictException({
        error: 'INVALID_STATE',
        message: 'Rider must arrive at pickup before verifying PIN',
      });
    }

    const isValid = await argon2.verify(job.pickupPinHash, pin);
    if (!isValid) {
      throw new BadRequestException({ error: 'PIN_INVALID', message: 'Incorrect pickup PIN' });
    }

    const updated = await this.transitionRiderState(
      jobId,
      riderUserId,
      'PICKED_UP',
      'Pickup PIN verified',
    );

    return updated;
  }

  async verifyDeliveryPin(jobId: string, riderUserId: string, pin: string) {
    const [job, rider] = await Promise.all([
      this.prisma.job.findUnique({ where: { id: jobId } }),
      this.prisma.rider.findFirst({ where: { userId: riderUserId, deletedAt: null } }),
    ]);
    if (!job) throw new NotFoundException('Job not found');
    if (!rider || job.riderId !== rider.id) throw new NotFoundException('Job not found');

    if (job.status !== 'ARRIVED_DROPOFF' && job.status !== 'IN_TRANSIT') {
      throw new ConflictException({
        error: 'INVALID_STATE',
        message: 'Rider must arrive at dropoff before verifying delivery PIN',
      });
    }

    const isValid = await argon2.verify(job.deliveryPinHash, pin);
    if (!isValid) {
      throw new BadRequestException({ error: 'PIN_INVALID', message: 'Incorrect delivery PIN' });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const currentJob = await tx.job.findUnique({ where: { id: jobId } });
      if (!currentJob || currentJob.riderId !== rider.id)
        throw new NotFoundException('Job not found');
      if (currentJob.status !== 'ARRIVED_DROPOFF' && currentJob.status !== 'IN_TRANSIT') {
        throw new ConflictException('Delivery has already been confirmed or is no longer valid.');
      }
      if (currentJob.riderShareAmount === null) {
        throw new ConflictException('Rider compensation is not configured for this booking.');
      }

      const payment = await tx.payment.findFirst({
        where: {
          jobId,
          method: currentJob.paymentMethod,
          ...(currentJob.paymentMethod === 'MPESA_STK' ? { status: 'SUCCEEDED' } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
      const riderAccountCode = await this.ledger.ensureRiderAccountInTransaction(tx, riderUserId);

      if (currentJob.paymentMethod === 'CASH_ON_DELIVERY') {
        if (payment)
          throw new ConflictException('COD has already been collected for this booking.');
        const codPayment = await tx.payment.create({
          data: {
            jobId,
            merchantId: currentJob.merchantId,
            method: 'CASH_ON_DELIVERY',
            status: 'SUCCEEDED',
            amount: currentJob.quotedAmount,
            currency: currentJob.currency,
            description: `COD collected for ${currentJob.referenceCode}`,
            processedAt: new Date(),
          },
        });
        await tx.codRecord.create({
          data: {
            paymentId: codPayment.id,
            jobId,
            riderId: rider.id,
            amount: currentJob.quotedAmount,
            currency: currentJob.currency,
            status: 'COLLECTED_BY_RIDER',
            collectedAt: new Date(),
            collectionConfirmedBy: riderUserId,
          },
        });
        await this.ledger.postTransactionInTransaction(tx, {
          type: 'COD_COLLECTION',
          description: `COD collection for ${currentJob.referenceCode}`,
          paymentId: codPayment.id,
          jobId,
          actorId: riderUserId,
          entries: buildFareSplitEntries(
            currentJob.quotedAmount,
            currentJob.riderShareAmount,
            'CASH_IN_TRANSIT_RIDER',
            riderAccountCode,
          ),
        });
      } else if (currentJob.paymentMethod === 'MPESA_STK') {
        if (!payment || payment.status !== 'SUCCEEDED') {
          throw new ConflictException(
            'M-Pesa payment must succeed before delivery can be confirmed.',
          );
        }
        if (currentJob.riderShareAmount > 0) {
          await this.ledger.postTransactionInTransaction(tx, {
            type: 'RIDER_EARNING',
            description: `Rider earnings allocated for ${currentJob.referenceCode}`,
            jobId,
            actorId: riderUserId,
            entries: [
              {
                debitAccountCode: 'RIDER_PAYABLE',
                creditAccountCode: riderAccountCode,
                amount: currentJob.riderShareAmount,
                description: 'Allocate earned balance to rider wallet',
              },
            ],
          });
        }
      } else {
        throw new ConflictException('The configured payment method is not supported.');
      }

      const deliveredAt = new Date();
      const updatedJob = await tx.job.update({
        where: { id: jobId },
        data: {
          status: 'DELIVERED',
          deliveryVerifiedAt: deliveredAt,
          actualDeliveryAt: deliveredAt,
          version: { increment: 1 },
        },
      });
      await tx.jobStateHistory.create({
        data: {
          jobId,
          actorId: riderUserId,
          fromStatus: currentJob.status,
          toStatus: 'DELIVERED',
          reason: 'Delivery PIN confirmed',
        },
      });
      return updatedJob;
    });
    this.eventEmitter.emit('job.status_changed', {
      jobId,
      oldStatus: job.status,
      newStatus: 'DELIVERED',
      riderId: job.riderId,
    });
    await this.notifications.sendDeliveryCompleted(job.recipientPhone, job.referenceCode);

    return updated;
  }

  async cancelJob(jobId: string, userId: string, reason?: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new NotFoundException('Job not found');
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, merchantId: merchant.id },
    });
    if (!job) throw new NotFoundException('Job not found');

    // Only allow cancel before picked up
    if (
      ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DROPOFF', 'DELIVERED', 'COMPLETED'].includes(job.status)
    ) {
      throw new BadRequestException('Cannot cancel delivery once parcel is picked up.');
    }

    return this.transitionState(jobId, 'CANCELLED', userId, reason || 'Merchant cancelled');
  }

  async getJobDetail(jobId: string, userId: string): Promise<JobDetailDto> {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId } });
    if (!merchant) throw new NotFoundException('Job not found');
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, merchantId: merchant.id },
      include: {
        rider: { include: { user: true } },
        stateHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!job) throw new NotFoundException('Job not found');

    return this.mapToDetailDto(job);
  }

  async getMerchantJobs(merchantUserId: string, page = 1, limit = 20) {
    const merchant = await this.prisma.merchant.findUnique({ where: { userId: merchantUserId } });
    if (!merchant)
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0, hasNext: false, hasPrev: false },
      };

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where: { merchantId: merchant.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.job.count({ where: { merchantId: merchant.id } }),
    ]);

    const summaries: JobSummaryDto[] = jobs.map((j) => ({
      id: j.id,
      referenceCode: j.referenceCode,
      status: j.status as any,
      pickupTown: j.pickupTown,
      dropoffTown: j.dropoffTown,
      recipientName: j.recipientName,
      vehicleType: j.vehicleType as any,
      quotedAmount: j.quotedAmount,
      currency: j.currency,
      paymentMethod: j.paymentMethod as any,
      createdAt: j.createdAt.toISOString(),
      estimatedDeliveryAt: j.estimatedDeliveryAt?.toISOString() ?? null,
    }));

    return {
      data: summaries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  private mapToDetailDto(job: any, extra?: { pickupPin?: string }): JobDetailDto {
    return {
      id: job.id,
      referenceCode: job.referenceCode,
      status: job.status,
      merchantId: job.merchantId,
      riderId: job.riderId,
      pickup: {
        street: job.pickupStreet,
        building: job.pickupBuilding,
        area: job.pickupArea,
        town: job.pickupTown,
        instructions: job.pickupInstructions,
        latitude: Number(job.pickupLat),
        longitude: Number(job.pickupLng),
      },
      dropoff: {
        street: job.dropoffStreet,
        building: job.dropoffBuilding,
        area: job.dropoffArea,
        town: job.dropoffTown,
        instructions: job.dropoffInstructions,
        latitude: Number(job.dropoffLat),
        longitude: Number(job.dropoffLng),
      },
      recipientName: job.recipientName,
      recipientPhone: job.recipientPhone,
      vehicleType: job.vehicleType,
      parcelSize: job.parcelSize,
      parcelDescription: job.parcelDescription,
      isFragile: job.isFragile,
      distanceMeters: job.distanceMeters,
      distanceSource: job.distanceSource,
      quotedAmount: job.quotedAmount,
      finalAmount: job.finalAmount,
      currency: job.currency,
      paymentMethod: job.paymentMethod,
      createdAt: job.createdAt.toISOString(),
      estimatedDeliveryAt: job.estimatedDeliveryAt?.toISOString() ?? null,
      estimatedPickupAt: job.estimatedPickupAt?.toISOString() ?? null,
      actualPickupAt: job.actualPickupAt?.toISOString() ?? null,
      actualDeliveryAt: job.actualDeliveryAt?.toISOString() ?? null,
      cancellationReason: job.cancellationReason,
      cancellationNote: job.cancellationNote,
      publicTrackingToken: job.publicTrackingToken,
      rider: job.rider
        ? {
            id: job.rider.id,
            displayName: job.rider.user?.displayName,
            phone: job.rider.user?.phone,
            avatarUrl: job.rider.user?.avatarUrl,
            vehicleType: job.vehicleType,
            plateNumber: null,
            averageRating: job.rider.averageRating == null ? null : Number(job.rider.averageRating),
          }
        : null,
      stateHistory: (job.stateHistory || []).map((h: any) => ({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        reason: h.reason,
        createdAt: h.createdAt.toISOString(),
      })),
      ...(extra || {}),
    } as any;
  }
}
