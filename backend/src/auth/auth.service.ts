import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/database/prisma.service';
import { OtpService } from './otp.service';
import { SessionService } from './session.service';
import { TotpService } from './totp.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  STAFF_PORTAL_ROLES,
  type AuthUser,
  type CustomerPortalRole,
  type LoginRole,
} from '@haraka/shared-types';
import { createHash, randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { normalizeKenyanPhone } from '@haraka/validation';

let dummyPasswordHash: Promise<string> | undefined;

function isLoopbackAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^::ffff:/, '');
  return normalized === '127.0.0.1' || normalized === '::1';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly otpService: OtpService,
    private readonly sessionService: SessionService,
    private readonly totpService: TotpService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async register(
    fullName: string,
    phone: string,
    password: string,
    role: CustomerPortalRole,
    ipAddress: string,
  ): Promise<{ phone: string; displayName: string }> {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          phone,
          displayName: fullName,
          passwordHash,
          phoneVerified: false,
          roles: [role],
          ...(role === 'MERCHANT'
            ? { merchant: { create: { businessName: fullName } } }
            : { rider: { create: { verificationStatus: 'PENDING' } } }),
        },
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('An account already exists for that phone number.');
      }
      throw error;
    }

    await this.audit.log({
      actorId: user.id,
      action: 'USER_REGISTER',
      resource: 'auth',
      resourceId: user.id,
      ipAddress,
      outcome: 'success',
    });
    return { phone: user.phone, displayName: user.displayName };
  }

  async loginWithPassword(
    phone: string,
    password: string,
    ipAddress: string,
    userAgent: string,
    role?: LoginRole,
    remoteAddress = '',
  ): Promise<
    | {
        mfaRequired: true;
        challengeToken: string;
        setupRequired: boolean;
      }
    | {
        mfaRequired: false;
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }
  > {
    const normalizedPhone = normalizeKenyanPhone(phone);
    const user = normalizedPhone
      ? await this.prisma.user.findUnique({ where: { phone: normalizedPhone } })
      : null;
    dummyPasswordHash ??= argon2.hash(randomBytes(32).toString('hex'), { type: argon2.argon2id });
    const hash = user?.passwordHash ?? (await dummyPasswordHash);
    const passwordValid = await argon2.verify(hash, password);
    const privileged = user?.roles.some((assignedRole: string) =>
      STAFF_PORTAL_ROLES.includes(assignedRole as (typeof STAFF_PORTAL_ROLES)[number]),
    );
    const now = new Date();
    const locked = user?.lockedUntil && user.lockedUntil > now;

    if (
      !user ||
      !passwordValid ||
      (role !== undefined && !user.roles.includes(role)) ||
      !user.isActive ||
      user.isSuspended ||
      locked
    ) {
      if (user && !locked) {
        const lockExpired = Boolean(user.lockedUntil && user.lockedUntil <= now);
        const nextFailureCount = (lockExpired ? 0 : user.failedLoginCount) + 1;
        const maxFailures = this.config.get<number>('AUTH_MAX_FAILED_ATTEMPTS', 5);
        const lockoutMinutes = this.config.get<number>('AUTH_LOCKOUT_MINUTES', 5);
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: lockExpired ? 1 : { increment: 1 },
            ...(nextFailureCount >= maxFailures
              ? { lockedUntil: new Date(Date.now() + lockoutMinutes * 60 * 1000) }
              : lockExpired
                ? { lockedUntil: null }
                : {}),
          },
        });
        await this.audit.log({
          actorId: user.id,
          action: 'LOGIN',
          resource: 'auth',
          ipAddress,
          outcome: 'failure',
          failReason: 'invalid_credentials_or_account_state',
        });
      } else if (!user) {
        await this.audit.log({
          action: 'LOGIN',
          resource: 'auth',
          ipAddress,
          outcome: 'failure',
          failReason: 'invalid_credentials_or_account_state',
        });
      }
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials.',
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    if (privileged) {
      const canSkipStaffMfa =
        this.config.get<string>('NODE_ENV') === 'development' &&
        this.config.get<string>('HARAKA_DEV_STAFF_MFA_BYPASS') === '1' &&
        isLoopbackAddress(remoteAddress);

      if (canSkipStaffMfa) {
        const session = await this.sessionService.createSession(user.id, ipAddress, userAgent);
        await this.audit.log({
          actorId: user.id,
          action: 'STAFF_MFA_DEV_BYPASS',
          resource: 'auth',
          ipAddress,
          userAgent,
          outcome: 'success',
        });
        return {
          ...session,
          user: {
            id: user.id,
            phone: user.phone,
            displayName: user.displayName,
            roles: user.roles as string[],
            preferredLanguage: user.preferredLanguage,
            isActive: user.isActive,
            isSuspended: user.isSuspended,
          },
          mfaRequired: false,
        };
      }

      await this.audit.log({
        actorId: user.id,
        action: 'LOGIN',
        resource: 'auth',
        ipAddress,
        userAgent,
        outcome: 'partial',
        failReason: 'staff_totp_required',
      });
      return {
        mfaRequired: true,
        ...(await this.createStaffMfaChallenge(user.id, ipAddress, userAgent)),
      };
    }

    const session = await this.sessionService.createSession(user.id, ipAddress, userAgent);
    await this.audit.log({
      actorId: user.id,
      action: 'LOGIN',
      resource: 'auth',
      ipAddress,
      userAgent,
      outcome: 'success',
    });
    return {
      ...session,
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        roles: user.roles as string[],
        preferredLanguage: user.preferredLanguage,
        isActive: user.isActive,
        isSuspended: user.isSuspended,
      },
      mfaRequired: false,
    };
  }

  async requestPasswordResetOtp(phone: string, ipAddress: string): Promise<void> {
    await this.sendPasswordResetOtp(phone, ipAddress);
  }

  async resetPasswordWithOtp(phone: string, code: string, password: string): Promise<void> {
    const { user } = await this.consumeOtp(phone, code, 'password_reset');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, phoneVerified: true, failedLoginCount: 0, lockedUntil: null },
      }),
      this.prisma.session.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false, revokedAt: new Date(), revokedReason: 'password_reset' },
      }),
    ]);
  }

  async requestEmailVerification(email: string): Promise<void> {
    if (!this.notifications.emailConfigured) {
      throw new ServiceUnavailableException('Email delivery is not configured.');
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerified && !user.isSuspended) {
      await this.sendActionEmail(user, 'EMAIL_VERIFICATION');
    }
  }

  async requestEmailPasswordReset(email: string): Promise<void> {
    if (!this.notifications.emailConfigured) {
      throw new ServiceUnavailableException('Email delivery is not configured.');
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.emailVerified && !user.isSuspended) {
      await this.sendActionEmail(user, 'PASSWORD_RESET');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.authActionToken.findFirst({
      where: {
        tokenHash,
        purpose: 'EMAIL_VERIFICATION',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) throw new BadRequestException('Verification link is invalid or expired.');

    await this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.authActionToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1)
        throw new BadRequestException('Verification link is invalid or expired.');

      await transaction.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      });
    });
  }

  async resetPasswordWithEmail(token: string, password: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.authActionToken.findFirst({
      where: {
        tokenHash,
        purpose: 'PASSWORD_RESET',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) throw new BadRequestException('Password reset link is invalid or expired.');

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.authActionToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1)
        throw new BadRequestException('Password reset link is invalid or expired.');
      await transaction.user.update({
        where: { id: record.userId },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      });
      await transaction.session.updateMany({
        where: { userId: record.userId, isActive: true },
        data: { isActive: false, revokedAt: new Date(), revokedReason: 'password_reset' },
      });
    });
  }

  private async sendPasswordResetOtp(phone: string, ipAddress: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) return;
    if (user.isSuspended) {
      return;
    }

    const otp = this.otpService.generate();
    const expiryMinutes = this.config.get<number>('OTP_EXPIRY_MINUTES', 10);
    const codeHash = await argon2.hash(otp, { type: argon2.argon2id });

    await this.prisma.otpCode.create({
      data: {
        userId: user.id,
        phone,
        codeHash,
        purpose: 'password_reset',
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
        ipAddress,
      },
    });

    await this.notifications.sendOtp(phone, otp, user.preferredLanguage);

    await this.audit.log({
      actorId: user.id,
      action: 'OTP_REQUEST',
      resource: 'auth',
      resourceId: user.id,
      ipAddress,
      outcome: 'success',
    });
  }

  private async createStaffMfaChallenge(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ challengeToken: string; setupRequired: boolean }> {
    const totpConfig = await this.prisma.totpConfig.findUnique({
      where: { userId },
      select: { isEnabled: true },
    });
    const challengeToken = randomBytes(32).toString('base64url');
    await this.prisma.authenticationAttempt.create({
      data: {
        userId,
        phone: createHash('sha256').update(challengeToken).digest('hex'),
        ipAddress,
        userAgent,
        action: 'staff_mfa_challenge',
        success: false,
      },
    });
    await this.audit.log({
      actorId: userId,
      action: 'STAFF_MFA_CHALLENGE',
      resource: 'auth',
      ipAddress,
      userAgent,
      outcome: 'success',
    });
    return { challengeToken, setupRequired: !totpConfig?.isEnabled };
  }

  async beginStaffMfaEnrollment(challengeToken: string) {
    const challenge = await this.findStaffMfaChallenge(challengeToken);
    const totpConfig = await this.prisma.totpConfig.findUnique({
      where: { userId: challenge.userId },
      select: { isEnabled: true },
    });
    if (totpConfig?.isEnabled) {
      throw new UnauthorizedException('TOTP is already configured for this account.');
    }
    return this.totpService.enroll(challenge.userId);
  }

  async completeStaffMfa(
    challengeToken: string,
    code: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    const challenge = await this.findStaffMfaChallenge(challengeToken);
    const user = await this.prisma.user.findUnique({ where: { id: challenge.userId } });
    if (
      !user ||
      !user.isActive ||
      user.isSuspended ||
      !user.roles.some((assignedRole: string) =>
        STAFF_PORTAL_ROLES.includes(assignedRole as (typeof STAFF_PORTAL_ROLES)[number]),
      )
    ) {
      throw new UnauthorizedException('Invalid or expired staff authentication challenge.');
    }

    const valid = await this.totpService.verify(user.id, code, ipAddress);
    if (!valid) {
      await this.audit.log({
        actorId: user.id,
        action: 'STAFF_MFA_LOGIN',
        resource: 'auth',
        ipAddress,
        userAgent,
        outcome: 'failure',
        failReason: 'invalid_totp_code',
      });
      throw new UnauthorizedException('Invalid or expired staff authentication challenge.');
    }

    const consumed = await this.prisma.authenticationAttempt.updateMany({
      where: {
        id: challenge.id,
        success: false,
        createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
      },
      data: { success: true },
    });
    if (consumed.count !== 1) {
      throw new UnauthorizedException('Invalid or expired staff authentication challenge.');
    }

    const session = await this.sessionService.createSession(user.id, ipAddress, userAgent);
    await this.audit.log({
      actorId: user.id,
      action: 'STAFF_MFA_LOGIN',
      resource: 'auth',
      ipAddress,
      userAgent,
      outcome: 'success',
    });
    return {
      ...session,
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        roles: user.roles as string[],
        preferredLanguage: user.preferredLanguage,
        isActive: user.isActive,
        isSuspended: user.isSuspended,
      },
    };
  }

  async refreshTokens(
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      throw new UnauthorizedException({ error: 'SESSION_EXPIRED', message: 'Session expired' });
    }

    return this.sessionService.rotateSession(session.id, session.user.id, ipAddress, userAgent);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.session.updateMany({
      where: { userId, refreshTokenHash: tokenHash },
      data: { isActive: false, revokedAt: new Date(), revokedReason: 'logout' },
    });
  }

  async getSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        isActive: true,
        lastActiveAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { isActive: false, revokedAt: new Date(), revokedReason: 'user_revoked' },
    });
  }

  private async consumeOtp(phone: string, code: string, purpose: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    const otpRecord = user
      ? await this.prisma.otpCode.findFirst({
          where: {
            phone,
            purpose,
            usedAt: null,
            expiresAt: { gt: new Date() },
            attempts: { lt: 5 },
          },
          orderBy: { createdAt: 'desc' },
        })
      : null;
    if (!user || !otpRecord || user.isSuspended || !user.isActive) {
      throw new UnauthorizedException({ error: 'OTP_INVALID', message: 'Invalid or expired code' });
    }

    const valid = await argon2.verify(otpRecord.codeHash, code);
    const attemptUpdate = await this.prisma.otpCode.updateMany({
      where: {
        id: otpRecord.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: otpRecord.maxAttempts },
      },
      data: {
        attempts: { increment: 1 },
        ...(valid ? { usedAt: new Date() } : {}),
      },
    });
    if (attemptUpdate.count !== 1 || !valid) {
      throw new UnauthorizedException({ error: 'OTP_INVALID', message: 'Invalid or expired code' });
    }
    return { user };
  }

  private async findStaffMfaChallenge(challengeToken: string) {
    const challengeHash = createHash('sha256').update(challengeToken).digest('hex');
    const challenge = await this.prisma.authenticationAttempt.findFirst({
      where: {
        phone: challengeHash,
        action: 'staff_mfa_challenge',
        success: false,
        createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
      },
      select: { id: true, userId: true },
    });
    const userId = challenge?.userId;
    if (!challenge || !userId) {
      throw new UnauthorizedException('Invalid or expired staff authentication challenge.');
    }
    return { id: challenge.id, userId };
  }

  private async sendActionEmail(
    user: { id: string; email: string | null },
    purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
  ): Promise<boolean> {
    if (!user.email || !this.notifications.emailConfigured) return false;
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(
      Date.now() + (purpose === 'EMAIL_VERIFICATION' ? 30 : 15) * 60 * 1000,
    );
    await this.prisma.authActionToken.updateMany({
      where: { userId: user.id, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.prisma.authActionToken.create({
      data: { userId: user.id, purpose, tokenHash, expiresAt },
    });

    const webUrl = this.config.get<string>('WEB_APP_URL', 'http://localhost:5173');
    let baseUrl: URL;
    try {
      baseUrl = new URL(webUrl);
    } catch {
      throw new BadRequestException('WEB_APP_URL must be a valid application URL.');
    }
    const action = purpose === 'EMAIL_VERIFICATION' ? 'verify-email' : 'reset-password';
    const link = new URL(`/login?mode=${action}&token=${encodeURIComponent(rawToken)}`, baseUrl);
    const subject =
      purpose === 'EMAIL_VERIFICATION' ? 'Verify your Haraka email' : 'Reset your Haraka password';
    const text = `Use this secure link within ${purpose === 'EMAIL_VERIFICATION' ? '30' : '15'} minutes:\n\n${link.toString()}\n\nIf you did not request this, you can ignore this email.`;
    await this.notifications.sendAccountEmail(user.email, subject, text);
    return true;
  }
}
