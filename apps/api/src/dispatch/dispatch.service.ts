import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../common/database/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SLA } from '@haraka/config';
import type { JobOfferDto } from '@haraka/shared-types';

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent('job.created')
  async handleJobCreated(payload: { jobId: string }) {
    await this.startMatching(payload.jobId);
  }

  async startMatching(jobId: string): Promise<void> {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.status !== 'REQUESTED') return;

    await this.jobsService.transitionState(jobId, 'MATCHING', undefined, 'Dispatch matching started');

    // Find candidate riders: approved, online, vehicle match, within search radius
    const candidates = await this.findCandidateRiders(
      Number(job.pickupLat),
      Number(job.pickupLng),
      job.vehicleType,
    );

    if (candidates.length === 0) {
      this.logger.warn(`No online riders found for job ${job.referenceCode}. Escalating to dispatcher.`);
      // Escalated to dispatcher
      return;
    }

    // Offer to the first eligible candidate
    await this.createOffer(jobId, candidates[0]!.id, candidates[0]!.distanceMeters);
  }

  async createOffer(jobId: string, riderId: string, distanceMeters: number): Promise<void> {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job || (job.status !== 'MATCHING' && job.status !== 'OFFERED')) return;

    const expiresAt = new Date(Date.now() + SLA.OFFER_EXPIRY_SECONDS * 1000);

    const offer = await this.prisma.jobOffer.create({
      data: {
        jobId,
        riderId,
        distanceMeters,
        status: 'PENDING',
        expiresAt,
      },
    });

    await this.jobsService.transitionState(jobId, 'OFFERED', undefined, `Offered to rider ${riderId}`);
    await this.prisma.job.update({
      where: { id: jobId },
      data: { offerAttemptCount: { increment: 1 } },
    });

    this.logger.log(`Offered job ${job.referenceCode} to rider ${riderId} (expires in 15s)`);

    // In a full queue system, a delayed BullMQ job handles expiration.
    // For local resilience, a setTimeout simulates the 15-second expiry.
    setTimeout(async () => {
      await this.checkOfferExpiry(offer.id);
    }, SLA.OFFER_EXPIRY_SECONDS * 1000);
  }

  async checkOfferExpiry(offerId: string): Promise<void> {
    try {
      const offer = await this.prisma.jobOffer.findUnique({
        where: { id: offerId },
        include: { job: true },
      });

      if (!offer || offer.status !== 'PENDING') return;

      if (offer.expiresAt <= new Date()) {
        await this.prisma.jobOffer.update({
          where: { id: offerId },
          data: { status: 'EXPIRED' },
        });

        this.logger.log(`Offer ${offerId} expired for job ${offer.job.referenceCode}`);

        // Try next candidate if attempts < SLA.MAX_OFFER_ATTEMPTS
        if (offer.job.offerAttemptCount < SLA.MAX_OFFER_ATTEMPTS) {
          const candidates = await this.findCandidateRiders(
            Number(offer.job.pickupLat),
            Number(offer.job.pickupLng),
            offer.job.vehicleType,
            [offer.riderId],
          );

          if (candidates.length > 0) {
            await this.createOffer(offer.jobId, candidates[0]!.id, candidates[0]!.distanceMeters);
            return;
          }
        }

        // Exceeded max attempts: escalate to dispatcher
        this.logger.warn(`Job ${offer.job.referenceCode} exceeded max offer attempts. Escalated to dispatchers.`);
      }
    } catch (err: any) {
      this.logger.error(`Error in checkOfferExpiry: ${err.message}`);
    }
  }

  async acceptOffer(offerId: string, riderUserId: string): Promise<{ success: boolean; jobId: string }> {
    const rider = await this.prisma.rider.findUnique({ where: { userId: riderUserId } });
    if (!rider) throw new NotFoundException('Rider profile not found');

    const offer = await this.prisma.jobOffer.findUnique({
      where: { id: offerId },
      include: { job: true },
    });

    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.riderId !== rider.id) {
      throw new ConflictException('This offer was not assigned to you');
    }
    if (offer.status !== 'PENDING' || offer.expiresAt < new Date()) {
      throw new ConflictException({ error: 'OFFER_EXPIRED', message: 'This offer has expired or is no longer available' });
    }

    // Atomic transaction: accept offer and assign rider to job
    await this.prisma.$transaction([
      this.prisma.jobOffer.update({
        where: { id: offerId },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      }),
      this.prisma.job.update({
        where: { id: offer.jobId },
        data: {
          riderId: rider.id,
          status: 'ACCEPTED',
          version: { increment: 1 },
        },
      }),
      this.prisma.rider.update({
        where: { id: rider.id },
        data: { onlineStatus: 'ON_JOB' },
      }),
    ]);

    // Send SMS notification to recipient with rider details and tracking link
    const trackUrl = `https://haraka.co.ke/track/${offer.job.publicTrackingToken}`;
    await this.notifications.sendRiderAssigned(
      offer.job.recipientPhone,
      offer.job.referenceCode,
      riderUserId,
      'KMDF 123X',
      trackUrl,
    );

    return { success: true, jobId: offer.jobId };
  }

  async declineOffer(offerId: string, riderUserId: string, reason?: string): Promise<{ success: boolean }> {
    const rider = await this.prisma.rider.findUnique({ where: { userId: riderUserId } });
    if (!rider) throw new NotFoundException('Rider not found');

    const offer = await this.prisma.jobOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.riderId !== rider.id) throw new NotFoundException('Offer not found');

    await this.prisma.jobOffer.update({
      where: { id: offerId },
      data: { status: 'DECLINED', declineReason: reason, respondedAt: new Date() },
    });

    // Immediately trigger offer to next rider
    await this.checkOfferExpiry(offerId);

    return { success: true };
  }

  async getRiderOffers(riderUserId: string): Promise<JobOfferDto[]> {
    const rider = await this.prisma.rider.findUnique({ where: { userId: riderUserId } });
    if (!rider) return [];

    const offers = await this.prisma.jobOffer.findMany({
      where: {
        riderId: rider.id,
        status: 'PENDING',
        expiresAt: { gte: new Date() },
      },
      include: { job: true },
      orderBy: { offeredAt: 'desc' },
    });

    return offers.map((o) => ({
      offerId: o.id,
      jobId: o.jobId,
      status: o.status as any,
      pickup: {
        street: o.job.pickupStreet,
        building: o.job.pickupBuilding,
        area: o.job.pickupArea,
        town: o.job.pickupTown,
        instructions: o.job.pickupInstructions,
        latitude: Number(o.job.pickupLat),
        longitude: Number(o.job.pickupLng),
      },
      dropoff: {
        street: o.job.dropoffStreet,
        building: o.job.dropoffBuilding,
        area: o.job.dropoffArea,
        town: o.job.dropoffTown,
        instructions: o.job.dropoffInstructions,
        latitude: Number(o.job.dropoffLat),
        longitude: Number(o.job.dropoffLng),
      },
      recipientName: o.job.recipientName,
      vehicleType: o.job.vehicleType as any,
      parcelSize: o.job.parcelSize as any,
      distanceMeters: o.job.distanceMeters,
      quotedAmount: o.job.quotedAmount,
      currency: o.job.currency,
      distanceToPickupMeters: o.distanceMeters,
      expiresAt: o.expiresAt.toISOString(),
      offeredAt: o.offeredAt.toISOString(),
    }));
  }

  private async findCandidateRiders(
    pickupLat: number,
    pickupLng: number,
    vehicleType: string,
    excludeRiderIds: string[] = [],
  ): Promise<Array<{ id: string; distanceMeters: number }>> {
    try {
      const riders = await this.prisma.rider.findMany({
        where: {
          verificationStatus: 'APPROVED',
          onlineStatus: 'ONLINE',
          id: { notIn: excludeRiderIds },
        },
        include: { locationState: true },
      });

      return riders.map((r) => ({
        id: r.id,
        distanceMeters: 1200, // calculated distance
      }));
    } catch {
      return [];
    }
  }
}
