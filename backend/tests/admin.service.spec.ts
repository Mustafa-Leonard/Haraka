import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AdminService } from '../src/admin/admin.service';
import type { PrismaService } from '../src/common/database/prisma.service';
import type { AuditService } from '../src/audit/audit.service';

function createAdminService(
  verificationStatus = 'PENDING',
  transitionCount = 1,
  updatedVerificationStatus = 'APPROVED',
) {
  const updatedRider = { id: 'rider-id', verificationStatus: updatedVerificationStatus };
  const transaction = {
    rider: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'rider-id',
        verificationStatus,
      }),
      updateMany: vi.fn().mockResolvedValue({ count: transitionCount }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(updatedRider),
    },
    riderVerificationEvent: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: vi.fn((callback: (tx: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
    ),
  };
  const audit = { log: vi.fn().mockResolvedValue(undefined) };
  const service = new AdminService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );
  return { service, prisma, transaction, audit };
}

describe('AdminService rider verification transitions', () => {
  it('approves eligible riders and records a transition event', async () => {
    const { service, transaction, audit } = createAdminService('UNDER_REVIEW');

    await service.approveRider('rider-id', 'staff-id');

    expect(transaction.rider.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'rider-id',
        verificationStatus: { in: ['PENDING', 'UNDER_REVIEW'] },
      },
      data: expect.objectContaining({
        verificationStatus: 'APPROVED',
        verifiedBy: 'staff-id',
      }),
    });
    expect(transaction.riderVerificationEvent.create).toHaveBeenCalledWith({
      data: {
        riderId: 'rider-id',
        actorId: 'staff-id',
        fromStatus: 'UNDER_REVIEW',
        toStatus: 'APPROVED',
      },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RIDER_APPROVE', outcome: 'success' }),
    );
  });

  it('rejects eligible applications with a recorded reason', async () => {
    const { service, transaction, audit } = createAdminService('PENDING', 1, 'REJECTED');

    const rider = await service.rejectRider(
      'rider-id',
      'staff-id',
      '  Missing vehicle documents  ',
    );

    expect(rider.verificationStatus).toBe('REJECTED');
    expect(transaction.riderVerificationEvent.create).toHaveBeenCalledWith({
      data: {
        riderId: 'rider-id',
        actorId: 'staff-id',
        fromStatus: 'PENDING',
        toStatus: 'REJECTED',
        reason: 'Missing vehicle documents',
      },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RIDER_REJECT',
        newValue: {
          verificationStatus: 'REJECTED',
          reason: 'Missing vehicle documents',
        },
      }),
    );
  });

  it.each(['REJECTED', 'SUSPENDED'])(
    'does not approve applications that are already %s',
    async (verificationStatus) => {
      const { service, transaction } = createAdminService(verificationStatus);

      await expect(service.approveRider('rider-id', 'staff-id')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(transaction.rider.updateMany).not.toHaveBeenCalled();
      expect(transaction.riderVerificationEvent.create).not.toHaveBeenCalled();
    },
  );

  it('fails closed if the application status changed before the update', async () => {
    const { service, transaction } = createAdminService('PENDING', 0);

    await expect(
      service.rejectRider('rider-id', 'staff-id', 'Incomplete documents'),
    ).rejects.toThrow('status changed');
    expect(transaction.riderVerificationEvent.create).not.toHaveBeenCalled();
  });
});
