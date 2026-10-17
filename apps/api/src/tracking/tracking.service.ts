import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { TrackingGateway } from './tracking.gateway';
import type { RiderLocationDto, PublicTrackingDto } from '@haraka/shared-types';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TrackingGateway,
  ) {}

  async ingestLocation(riderUserId: string, dto: RiderLocationDto) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId: riderUserId },
      include: {
        jobs: {
          where: {
            status: { in: ['ACCEPTED', 'ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DROPOFF'] },
          },
        },
      },
    });

    if (!rider) throw new NotFoundException('Rider not found');

    const recordedAt = new Date(dto.recordedAt || Date.now());

    // Update current location state
    await this.prisma.riderLocationState.upsert({
      where: { riderId: rider.id },
      update: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        heading: dto.heading,
        speed: dto.speed,
        altitude: dto.altitude,
        recordedAt,
        isStale: false,
      },
      create: {
        riderId: rider.id,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        heading: dto.heading,
        speed: dto.speed,
        altitude: dto.altitude,
        recordedAt,
      },
    });

    // If rider has active jobs, broadcast live coordinates to the job's room
    for (const job of rider.jobs) {
      this.gateway.broadcastLocation(job.id, {
        lat: dto.latitude,
        lng: dto.longitude,
        heading: dto.heading,
      });

      // Persist tracking point
      await this.prisma.trackingPoint.create({
        data: {
          jobId: job.id,
          riderId: rider.id,
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracy: dto.accuracy,
          heading: dto.heading,
          speed: dto.speed,
          recordedAt,
        },
      });
    }

    return { received: true };
  }

  async getPublicTracking(token: string): Promise<PublicTrackingDto> {
    const job = await this.prisma.job.findFirst({
      where: {
        publicTrackingToken: token,
      },
      include: {
        rider: {
          include: {
            user: true,
            locationState: true,
            vehicles: { include: { vehicle: true } },
          },
        },
        stateHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!job) throw new NotFoundException('Tracking information not found or link has expired');

    const primaryVehicle = job.rider?.vehicles?.find((v) => v.isPrimary)?.vehicle;

    return {
      referenceCode: job.referenceCode,
      status: job.status as any,
      pickup: {
        area: job.pickupArea,
        town: job.pickupTown,
        instructions: job.pickupInstructions,
      },
      dropoff: {
        area: job.dropoffArea,
        town: job.dropoffTown,
        instructions: job.dropoffInstructions,
      },
      recipientName: job.recipientName,
      vehicleType: job.vehicleType as any,
      estimatedDeliveryAt: job.estimatedDeliveryAt?.toISOString() ?? null,
      actualDeliveryAt: job.actualDeliveryAt?.toISOString() ?? null,
      riderName: job.rider?.user?.displayName ?? null,
      riderVehiclePlate: primaryVehicle?.plateNumber ?? null,
      lastLocation: job.rider?.locationState
        ? {
            latitude: Number(job.rider.locationState.latitude),
            longitude: Number(job.rider.locationState.longitude),
            recordedAt: job.rider.locationState.recordedAt.toISOString(),
          }
        : null,
      stateHistory: (job.stateHistory || []).map((h) => ({
        fromStatus: h.fromStatus as any,
        toStatus: h.toStatus as any,
        reason: h.reason,
        createdAt: h.createdAt.toISOString(),
      })),
      trackingInstruction: 'Please give your delivery PIN to the rider once they arrive.',
    };
  }

  async reportPublicIssue(token: string, category: string, description: string) {
    const job = await this.prisma.job.findFirst({ where: { publicTrackingToken: token } });
    if (!job) throw new NotFoundException('Job not found');

    await this.prisma.dispute.create({
      data: {
        jobId: job.id,
        reportedBy: job.id, // anonymous recipient identifier
        reporterRole: 'recipient',
        category,
        description,
        status: 'OPEN',
      },
    });

    return { received: true };
  }

  async submitPublicRating(token: string, score: number, comment?: string) {
    const job = await this.prisma.job.findFirst({ where: { publicTrackingToken: token } });
    if (!job || !job.riderId) throw new NotFoundException('Job not found or rider unassigned');

    await this.prisma.rating.upsert({
      where: {
        jobId_raterRole: {
          jobId: job.id,
          raterRole: 'recipient',
        },
      },
      update: { score, comment },
      create: {
        jobId: job.id,
        riderId: job.riderId,
        ratedBy: job.id,
        raterRole: 'recipient',
        score,
        comment,
      },
    });

    return { received: true };
  }
}
