import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { JobsService } from '../src/jobs/jobs.service';
import { JobsController } from '../src/jobs/jobs.controller';
import { ROLES_KEY } from '../src/auth/decorators/roles.decorator';
import type { PrismaService } from '../src/common/database/prisma.service';

function createJobsService(prismaOverrides: Record<string, unknown>) {
  const prisma = {
    merchant: { findUnique: vi.fn() },
    rider: { findFirst: vi.fn() },
    job: { findUnique: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
    ...prismaOverrides,
  };
  const service = new JobsService(
    prisma as unknown as PrismaService,
    {} as never,
    { validateTransition: vi.fn() } as never,
    {} as never,
    {} as never,
    { emit: vi.fn() } as never,
    {} as never,
  );
  return { service, prisma };
}

describe('JobsService ownership enforcement', () => {
  it('restricts merchant and rider job routes to their respective roles', () => {
    expect(Reflect.getMetadata(ROLES_KEY, JobsController.prototype.getJobDetail)).toEqual([
      'MERCHANT',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, JobsController.prototype.arrivePickup)).toEqual([
      'RIDER',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, JobsController.prototype.verifyDelivery)).toEqual([
      'RIDER',
    ]);
  });

  it('does not return another merchant delivery', async () => {
    const { service, prisma } = createJobsService({
      merchant: { findUnique: vi.fn().mockResolvedValue({ id: 'merchant-a' }) },
      job: { findUnique: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.getJobDetail('job-b', 'merchant-user-a')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.job.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-b', merchantId: 'merchant-a' },
      }),
    );
  });

  it('does not cancel another merchant delivery', async () => {
    const { service, prisma } = createJobsService({
      merchant: { findUnique: vi.fn().mockResolvedValue({ id: 'merchant-a' }) },
      job: { findUnique: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.cancelJob('job-b', 'merchant-user-a')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.job.findFirst).toHaveBeenCalledWith({
      where: { id: 'job-b', merchantId: 'merchant-a' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not allow an unassigned rider to transition a delivery', async () => {
    const tx = {
      job: { findUnique: vi.fn().mockResolvedValue({ id: 'job-a', riderId: 'rider-b' }) },
    };
    const { service, prisma } = createJobsService({
      rider: { findFirst: vi.fn().mockResolvedValue({ id: 'rider-a' }) },
      $transaction: vi.fn((callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
    });

    await expect(
      service.transitionRiderState('job-a', 'rider-user-a', 'ARRIVED_PICKUP', 'Arrived'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.job.findUnique).toHaveBeenCalledWith({ where: { id: 'job-a' } });
  });

  it('does not allow an unassigned rider to verify a pickup PIN', async () => {
    const { service } = createJobsService({
      job: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'job-a',
          riderId: 'rider-b',
          status: 'ARRIVED_PICKUP',
          pickupPinHash: 'unused',
        }),
        findFirst: vi.fn(),
      },
      rider: { findFirst: vi.fn().mockResolvedValue({ id: 'rider-a' }) },
    });

    await expect(service.verifyPickupPin('job-a', 'rider-user-a', '1234')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
