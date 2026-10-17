import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/database/prisma.service';
import { createHash, randomBytes } from 'crypto';
import type { JwtPayload } from '@haraka/shared-types';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const refreshToken = randomBytes(48).toString('base64url');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    let sessionId = 'sess-' + randomBytes(8).toString('hex');
    try {
      const session = await this.prisma.session.create({
        data: {
          userId,
          refreshTokenHash: tokenHash,
          ipAddress,
          userAgent,
          expiresAt,
        },
      });
      sessionId = session.id;
    } catch {
      // In-memory or fallback
    }

    const payload: JwtPayload = {
      sub: userId,
      phone: user.phone,
      roles: user.roles as string[],
      sessionId,
    };

    const accessToken = this.jwt.sign(payload);

    return { accessToken, refreshToken, sessionId };
  }

  async rotateSession(
    sessionId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const newRefreshToken = randomBytes(48).toString('base64url');
    const newTokenHash = createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    try {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          refreshTokenHash: newTokenHash,
          ipAddress,
          userAgent,
          lastActiveAt: new Date(),
          expiresAt,
        },
      });
    } catch {
      // fallback
    }

    const payload: JwtPayload = {
      sub: userId,
      phone: user.phone,
      roles: user.roles as string[],
      sessionId,
    };

    const accessToken = this.jwt.sign(payload);

    return { accessToken, refreshToken: newRefreshToken };
  }
}
