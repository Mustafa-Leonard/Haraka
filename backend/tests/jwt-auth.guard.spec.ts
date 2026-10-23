import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../src/common/database/prisma.service';

function createContext() {
  const request = { headers: { authorization: 'Bearer valid-token' } };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  };
  return { context, request };
}

describe('JwtAuthGuard session validation', () => {
  it('allows a valid token only when its database session is active', async () => {
    const user = {
      id: 'user-id',
      phone: '+254712345678',
      displayName: 'Staff',
      roles: ['ADMIN'],
      preferredLanguage: 'en',
      isActive: true,
      isSuspended: false,
    };
    const jwt = { verify: vi.fn().mockReturnValue({ sub: 'user-id', sessionId: 'session-id' }) };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(user) },
      session: {
        findUnique: vi.fn().mockResolvedValue({
          userId: 'user-id',
          isActive: true,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      },
    };
    const guard = new JwtAuthGuard(
      jwt as unknown as JwtService,
      { get: (_key: string, defaultValue: unknown) => defaultValue } as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
    const { context, request } = createContext();

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(prisma.session.findUnique).toHaveBeenCalledWith({ where: { id: 'session-id' } });
    expect((request as Record<string, unknown>)['user']).toMatchObject({ id: 'user-id' });
  });

  it('rejects tokens for revoked sessions', async () => {
    const jwt = { verify: vi.fn().mockReturnValue({ sub: 'user-id', sessionId: 'session-id' }) };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-id',
          phone: '+254712345678',
          displayName: 'Staff',
          roles: ['ADMIN'],
          preferredLanguage: 'en',
          isActive: true,
          isSuspended: false,
        }),
      },
      session: {
        findUnique: vi.fn().mockResolvedValue({
          userId: 'user-id',
          isActive: false,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      },
    };
    const guard = new JwtAuthGuard(
      jwt as unknown as JwtService,
      { get: (_key: string, defaultValue: unknown) => defaultValue } as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
    const { context } = createContext();

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
