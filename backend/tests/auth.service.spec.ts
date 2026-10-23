import { beforeAll, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from '../src/auth/auth.service';
import type { PrismaService } from '../src/common/database/prisma.service';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { OtpService } from '../src/auth/otp.service';
import type { SessionService } from '../src/auth/session.service';
import type { TotpService } from '../src/auth/totp.service';
import type { AuditService } from '../src/audit/audit.service';
import type { NotificationsService } from '../src/notifications/notifications.service';

const password = 'a-long-test-password';
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await argon2.hash(password, { type: argon2.argon2id });
});

function createService(
  prisma: Record<string, any>,
  userOverrides: Record<string, unknown> = {},
  configValues: Record<string, unknown> = {},
) {
  const user = {
    id: 'user-id',
    phone: '+254712345678',
    email: 'merchant@example.test',
    emailVerified: true,
    passwordHash,
    displayName: 'Merchant',
    roles: ['MERCHANT'],
    preferredLanguage: 'en',
    isActive: true,
    isSuspended: false,
    phoneVerified: true,
    failedLoginCount: 0,
    lockedUntil: null,
    ...userOverrides,
  };
  const data = {
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(user),
      updateMany: vi.fn(),
    },
    otpCode: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    authenticationAttempt: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    totpConfig: { findUnique: vi.fn().mockResolvedValue({ isEnabled: true }) },
    session: { updateMany: vi.fn() },
    authActionToken: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
    ...prisma,
  };
  const session = {
    createSession: vi.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      sessionId: 'session-id',
    }),
    rotateSession: vi.fn(),
  };
  const notifications = {
    emailConfigured: true,
    sendOtp: vi.fn(),
    sendAccountEmail: vi.fn(),
  };
  const audit = { log: vi.fn() };
  const totp = {
    enroll: vi.fn().mockResolvedValue({
      secret: 'secret',
      otpauthUrl: 'otpauth://test',
      qrCodeDataUrl: 'data:image/png;base64,test',
    }),
    verify: vi.fn().mockResolvedValue(true),
  };
  const service = new AuthService(
    data as unknown as PrismaService,
    {} as JwtService,
    {
      get: (key: string, defaultValue: unknown) => configValues[key] ?? defaultValue,
    } as unknown as ConfigService,
    { generate: () => '123456' } as unknown as OtpService,
    session as unknown as SessionService,
    totp as unknown as TotpService,
    audit as unknown as AuditService,
    notifications as unknown as NotificationsService,
  );
  return { service, prisma: data, session, notifications, totp, user, audit };
}

describe('AuthService password authentication', () => {
  it.each([
    ['MERCHANT', { merchant: { create: { businessName: 'Merchant' } } }],
    ['RIDER', { rider: { create: { verificationStatus: 'PENDING' } } }],
  ] as const)('creates a %s role account with its profile', async (role, profile) => {
    const createdUser = {
      id: 'user-id',
      phone: '+254712345678',
      displayName: 'Merchant',
    };
    const { service, prisma } = createService({
      user: { create: vi.fn().mockResolvedValue(createdUser) },
    });

    await service.register('Merchant', '+254712345678', password, role, '127.0.0.1');

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        phone: '+254712345678',
        displayName: 'Merchant',
        roles: [role],
        ...profile,
      }),
    });
  });

  it('normalizes phone identifiers and issues a customer session', async () => {
    const { service, prisma, session } = createService({});

    const result = await service.loginWithPassword(
      '0712 345 678',
      password,
      '127.0.0.1',
      'test-agent',
    );

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { phone: '+254712345678' } });
    expect(session.createSession).toHaveBeenCalledWith('user-id', '127.0.0.1', 'test-agent');
    expect(result.user.roles).toEqual(['MERCHANT']);
    expect(result.accessToken).toBe('access-token');
  });

  it('allows password sign-in without a separate phone verification step', async () => {
    const { service, session } = createService({}, { phoneVerified: false });

    const result = await service.loginWithPassword(
      '+254712345678',
      password,
      '127.0.0.1',
      'test-agent',
    );

    expect(session.createSession).toHaveBeenCalledOnce();
    expect(result.mfaRequired).toBe(false);
  });

  it('rejects a valid password when the requested portal role is not assigned', async () => {
    const { service, session } = createService({});

    await expect(
      service.loginWithPassword('+254712345678', password, '127.0.0.1', 'test-agent', 'RIDER'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(session.createSession).not.toHaveBeenCalled();
  });

  it('requires the selected staff role and challenges only a matching staff account for TOTP', async () => {
    const { service, prisma, session } = createService({}, { roles: ['FINANCE'] });

    await expect(
      service.loginWithPassword('+254712345678', password, '127.0.0.1', 'test-agent', 'SUPPORT'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.authenticationAttempt.create).not.toHaveBeenCalled();

    const result = await service.loginWithPassword(
      '+254712345678',
      password,
      '127.0.0.1',
      'test-agent',
      'FINANCE',
    );
    expect(result.mfaRequired).toBe(true);
    expect(session.createSession).not.toHaveBeenCalled();
  });

  it('allows the explicit development MFA bypass only for loopback requests', async () => {
    const config = {
      NODE_ENV: 'development',
      HARAKA_DEV_STAFF_MFA_BYPASS: '1',
    };
    const { service, session, audit } = createService({}, { roles: ['ADMIN'] }, config);

    const result = await service.loginWithPassword(
      '+254712345678',
      password,
      '127.0.0.1',
      'test-agent',
      'ADMIN',
      '::ffff:127.0.0.1',
    );

    expect(result.mfaRequired).toBe(false);
    expect(session.createSession).toHaveBeenCalledOnce();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'STAFF_MFA_DEV_BYPASS', outcome: 'success' }),
    );
  });

  it('still requires TOTP when the MFA bypass request is not from loopback', async () => {
    const { service, session } = createService(
      {},
      { roles: ['ADMIN'] },
      { NODE_ENV: 'development', HARAKA_DEV_STAFF_MFA_BYPASS: '1' },
    );

    const result = await service.loginWithPassword(
      '+254712345678',
      password,
      '203.0.113.10',
      'test-agent',
      'ADMIN',
      '203.0.113.10',
    );

    expect(result.mfaRequired).toBe(true);
    expect(session.createSession).not.toHaveBeenCalled();
  });

  it('uses the configured failed-attempt threshold and lockout duration', async () => {
    const { service, prisma } = createService(
      {},
      { failedLoginCount: 9 },
      { AUTH_MAX_FAILED_ATTEMPTS: 10, AUTH_LOCKOUT_MINUTES: 30 },
    );
    const requestStartedAt = Date.now();

    await expect(
      service.loginWithPassword('+254712345678', 'wrong-password', '127.0.0.1', 'test-agent'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const update = prisma.user.update.mock.calls[0][0];
    expect(update.data.failedLoginCount).toEqual({ increment: 1 });
    expect(update.data.lockedUntil.getTime()).toBeGreaterThanOrEqual(
      requestStartedAt + 30 * 60 * 1000,
    );
  });

  it('does not create accounts when an unknown phone requests password recovery', async () => {
    const { service, prisma } = createService({
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
    });

    await service.requestPasswordResetOtp('+254712345678', '127.0.0.1');

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('blocks staff accounts from customer password sign-in', async () => {
    const { service, session } = createService({}, { roles: ['ADMIN'] });

    await expect(
      service.loginWithPassword('+254712345678', password, '127.0.0.1', 'test-agent', 'MERCHANT'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(session.createSession).not.toHaveBeenCalled();
  });

  it('consumes email verification tokens and verifies the account in one transaction', async () => {
    const transaction = {
      authActionToken: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      user: { update: vi.fn().mockResolvedValue({}) },
    };
    const { service, prisma } = createService({
      authActionToken: {
        findFirst: vi.fn().mockResolvedValue({ id: 'token-id', userId: 'user-id' }),
      },
      $transaction: vi.fn(async (operation: (transaction: typeof transaction) => Promise<void>) =>
        operation(transaction),
      ),
    });

    await service.verifyEmail('raw-verification-token');

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(transaction.authActionToken.updateMany).toHaveBeenCalledOnce();
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { emailVerified: true },
    });
  });

  it('requires TOTP after staff SMS OTP and does not create a session yet', async () => {
    const { service, prisma, session } = createService(
      {
        otpCode: {
          findFirst: vi.fn().mockResolvedValue({ id: 'otp-id', codeHash: passwordHash }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      },
      { roles: ['ADMIN'] },
    );

    const result = await service.loginWithPassword(
      '+254712345678',
      password,
      '127.0.0.1',
      'test-agent',
    );

    expect(result).toMatchObject({ setupRequired: false });
    expect(result.challengeToken).toHaveLength(43);
    expect(prisma.authenticationAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'staff_mfa_challenge', success: false }),
      }),
    );
    expect(session.createSession).not.toHaveBeenCalled();
  });

  it('creates a staff session only after a valid TOTP challenge is consumed', async () => {
    const { service, prisma, session, totp } = createService({
      authenticationAttempt: {
        findFirst: vi.fn().mockResolvedValue({ id: 'challenge-id', userId: 'user-id' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-id',
          phone: '+254712345678',
          displayName: 'Operator',
          roles: ['ADMIN'],
          preferredLanguage: 'en',
          isActive: true,
          isSuspended: false,
        }),
      },
    });

    const result = await service.completeStaffMfa('challenge-token', '123456', '127.0.0.1', 'ua');

    expect(totp.verify).toHaveBeenCalledWith('user-id', '123456', '127.0.0.1');
    expect(prisma.authenticationAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'challenge-id', success: false }),
      }),
    );
    expect(session.createSession).toHaveBeenCalledWith('user-id', '127.0.0.1', 'ua');
    expect(result.user.roles).toEqual(['ADMIN']);
  });

  it('does not issue a staff session when a TOTP challenge was already consumed', async () => {
    const { service, session } = createService({
      authenticationAttempt: {
        findFirst: vi.fn().mockResolvedValue({ id: 'challenge-id', userId: 'user-id' }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-id',
          phone: '+254712345678',
          displayName: 'Operator',
          roles: ['ADMIN'],
          preferredLanguage: 'en',
          isActive: true,
          isSuspended: false,
        }),
      },
    });

    await expect(
      service.completeStaffMfa('challenge-token', '123456', '127.0.0.1', 'ua'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(session.createSession).not.toHaveBeenCalled();
  });

  it('does not issue a staff session when TOTP verification fails', async () => {
    const { service, session, totp } = createService({
      authenticationAttempt: {
        findFirst: vi.fn().mockResolvedValue({ id: 'challenge-id', userId: 'user-id' }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-id',
          phone: '+254712345678',
          displayName: 'Operator',
          roles: ['ADMIN'],
          preferredLanguage: 'en',
          isActive: true,
          isSuspended: false,
        }),
      },
    });
    totp.verify.mockResolvedValue(false);

    await expect(
      service.completeStaffMfa('challenge-token', '000000', '127.0.0.1', 'ua'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(session.createSession).not.toHaveBeenCalled();
  });
});
