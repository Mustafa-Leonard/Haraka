import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import { PrismaService } from '../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as argon2 from 'argon2';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

@Injectable()
export class TotpService {
  private readonly encKey: Buffer;
  private readonly keyId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {
    const hexKey = this.config.get<string>(
      'FIELD_ENCRYPTION_KEY',
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );
    this.encKey = Buffer.from(hexKey, 'hex');
    this.keyId = this.config.get<string>('FIELD_ENCRYPTION_KEY_ID', 'v1');
  }

  async enroll(
    userId: string,
  ): Promise<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }> {
    const appName = this.config.get<string>('TOTP_APP_NAME', 'Haraka Admin');
    const issuer = this.config.get<string>('TOTP_ISSUER', 'haraka.co.ke');

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const totp = new OTPAuth.TOTP({
      issuer,
      label: `${appName} (${user.phone})`,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const secret = totp.secret.base32;
    const secretEncrypted = this.encrypt(secret);

    await this.prisma.totpConfig.upsert({
      where: { userId },
      create: { userId, secretEncrypted, keyId: this.keyId, isEnabled: false },
      update: { secretEncrypted, keyId: this.keyId, isEnabled: false },
    });

    const otpauthUrl = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  async verify(userId: string, code: string, ipAddress = ''): Promise<boolean> {
    const config = await this.prisma.totpConfig.findUnique({ where: { userId } });
    if (!config) throw new UnauthorizedException('TOTP not configured');
    if (config.lastUsedAt && Date.now() - config.lastUsedAt.getTime() < 30_000) {
      return false;
    }

    const secret = this.decrypt(config.secretEncrypted);
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const delta = totp.validate({ token: code, window: 1 });
    const valid = delta !== null;

    if (valid) {
      await this.prisma.totpConfig.update({
        where: { userId },
        data: { isEnabled: true, enabledAt: new Date(), lastUsedAt: new Date() },
      });
      await this.audit.log({
        actorId: userId,
        action: 'MFA_VERIFY',
        resource: 'auth',
        ipAddress,
        outcome: 'success',
      });
    }

    return valid;
  }

  private encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  private decrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, 'base64');
    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.encKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
