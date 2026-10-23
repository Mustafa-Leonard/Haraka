import { describe, expect, it, vi } from 'vitest';
import * as OTPAuth from 'otpauth';
import { TotpService } from '../src/auth/totp.service';
import type { PrismaService } from '../src/common/database/prisma.service';
import type { ConfigService } from '@nestjs/config';
import type { AuditService } from '../src/audit/audit.service';

describe('TotpService', () => {
  it('enables a new authenticator after a valid code and rejects immediate reuse', async () => {
    let storedConfig: {
      userId: string;
      secretEncrypted: string;
      keyId: string;
      isEnabled: boolean;
      lastUsedAt: Date | null;
    } | null = null;
    const prisma = {
      user: { findUniqueOrThrow: vi.fn().mockResolvedValue({ phone: '+254712345678' }) },
      totpConfig: {
        upsert: vi.fn(async ({ create }: { create: NonNullable<typeof storedConfig> }) => {
          storedConfig = create;
          return create;
        }),
        findUnique: vi.fn(async () => storedConfig),
        update: vi.fn(async ({ data }: { data: Partial<NonNullable<typeof storedConfig>> }) => {
          storedConfig = { ...storedConfig!, ...data };
          return storedConfig;
        }),
      },
    };
    const service = new TotpService(
      prisma as unknown as PrismaService,
      {
        get: (_key: string, defaultValue: unknown) => defaultValue,
      } as unknown as ConfigService,
      { log: vi.fn() } as unknown as AuditService,
    );

    const enrollment = await service.enroll('staff-user');
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(enrollment.secret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const validCode = totp.generate();
    const invalidCode = validCode === '000000' ? '000001' : '000000';
    expect(await service.verify('staff-user', invalidCode)).toBe(false);
    expect(prisma.totpConfig.update).not.toHaveBeenCalled();
    expect(await service.verify('staff-user', validCode)).toBe(true);
    expect(storedConfig?.isEnabled).toBe(true);
    expect(await service.verify('staff-user', totp.generate())).toBe(false);
    expect(prisma.totpConfig.update).toHaveBeenCalledOnce();
  });

  it('rejects verification if no authenticator has been enrolled', async () => {
    const prisma = {
      totpConfig: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };
    const service = new TotpService(
      prisma as unknown as PrismaService,
      { get: (_key: string, defaultValue: unknown) => defaultValue } as unknown as ConfigService,
      { log: vi.fn() } as unknown as AuditService,
    );

    await expect(service.verify('staff-user', '000000')).rejects.toThrow('TOTP not configured');
    expect(prisma.totpConfig.update).not.toHaveBeenCalled();
  });
});
