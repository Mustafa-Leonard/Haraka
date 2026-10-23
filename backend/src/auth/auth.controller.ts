import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from '@haraka/shared-types';
import type { LoginRole } from '@haraka/shared-types';
import {
  emailActionRequestSchema,
  emailTokenSchema,
  passwordLoginSchema,
  passwordResetEmailSchema,
  passwordResetOtpSchema,
  passwordResetRequestSchema,
  registerSchema,
  staffMfaChallengeSchema,
  staffMfaVerifySchema,
} from '@haraka/validation';
import { ZodBody } from '../common/decorators/zod-body.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a merchant or pending rider with phone and password' })
  async register(
    @ZodBody(registerSchema)
    body: {
      fullName: string;
      phone: string;
      role: 'MERCHANT' | 'RIDER';
      password: string;
      confirmPassword: string;
    },
    @Req() req: FastifyRequest,
  ) {
    const data = await this.authService.register(
      body.fullName,
      body.phone,
      body.password,
      body.role,
      req.ip ?? '',
    );
    return {
      data,
      message: 'Account created successfully.',
    };
  }

  @Post('password/login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with phone number and password' })
  async passwordLogin(
    @ZodBody(passwordLoginSchema)
    body: { phone: string; password: string; role?: LoginRole },
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.loginWithPassword(
      body.phone,
      body.password,
      req.ip ?? '',
      (req.headers['user-agent'] as string) ?? '',
      body.role,
      req.raw.socket.remoteAddress ?? '',
    );
    if (result.mfaRequired) {
      return { data: result };
    }
    this.setRefreshCookie(res, result.refreshToken);
    return {
      data: {
        mfaRequired: false as const,
        accessToken: result.accessToken,
        expiresIn: 900,
        tokenType: 'Bearer' as const,
        user: result.user,
      },
    };
  }

  @Post('password/reset/phone/request')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async requestPhonePasswordReset(
    @ZodBody(passwordResetRequestSchema) body: { phone: string },
    @Req() req: FastifyRequest,
  ) {
    await this.authService.requestPasswordResetOtp(body.phone, req.ip ?? '');
    return { message: 'If the account exists, a password reset code has been sent.' };
  }

  @Post('password/reset/phone/complete')
  @HttpCode(HttpStatus.OK)
  async resetPasswordWithOtp(
    @ZodBody(passwordResetOtpSchema) body: { phone: string; code: string; password: string },
  ) {
    await this.authService.resetPasswordWithOtp(body.phone, body.code, body.password);
    return { message: 'Password updated. Sign in using your new password.' };
  }

  @Post('password/reset/email/request')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async requestEmailPasswordReset(@ZodBody(emailActionRequestSchema) body: { email: string }) {
    await this.authService.requestEmailPasswordReset(body.email);
    return {
      message: 'If the verified email is on an account, a password reset link has been sent.',
    };
  }

  @Post('password/reset/email/complete')
  @HttpCode(HttpStatus.OK)
  async resetPasswordWithEmail(
    @ZodBody(passwordResetEmailSchema) body: { token: string; password: string },
  ) {
    await this.authService.resetPasswordWithEmail(body.token, body.password);
    return { message: 'Password updated. Sign in using your new password.' };
  }

  @Post('email/verification/request')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async requestEmailVerification(@ZodBody(emailActionRequestSchema) body: { email: string }) {
    await this.authService.requestEmailVerification(body.email);
    return { message: 'If verification is available, a link has been sent.' };
  }

  @Post('email/verification/complete')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@ZodBody(emailTokenSchema) body: { token: string }) {
    await this.authService.verifyEmail(body.token);
    return { message: 'Email verified. You can sign in using your email address.' };
  }

  @Post('staff/mfa/enroll')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async beginStaffMfaEnrollment(
    @ZodBody(staffMfaChallengeSchema) body: { challengeToken: string },
  ) {
    return { data: await this.authService.beginStaffMfaEnrollment(body.challengeToken) };
  }

  @Post('staff/mfa/verify')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async completeStaffMfa(
    @ZodBody(staffMfaVerifySchema) body: { challengeToken: string; code: string },
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.completeStaffMfa(
      body.challengeToken,
      body.code,
      req.ip ?? '',
      (req.headers['user-agent'] as string) ?? '',
    );
    this.setRefreshCookie(res, result.refreshToken);
    return {
      data: {
        accessToken: result.accessToken,
        expiresIn: 900,
        tokenType: 'Bearer' as const,
        user: result.user,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh cookie' })
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const cookies = (req as any).cookies || {};
    const refreshToken = cookies['haraka_refresh'];

    if (!refreshToken) {
      if (res && typeof res.status === 'function') res.status(HttpStatus.UNAUTHORIZED);
      return { error: 'UNAUTHORIZED', message: 'Refresh token missing' };
    }

    const result = await this.authService.refreshTokens(
      refreshToken,
      req.ip ?? '',
      (req.headers['user-agent'] as string) ?? '',
    );

    this.setRefreshCookie(res, result.refreshToken);

    return {
      data: {
        accessToken: result.accessToken,
        expiresIn: 900,
        tokenType: 'Bearer' as const,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout and revoke current session' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const cookies = (req as any).cookies || {};
    const refreshToken = cookies['haraka_refresh'];
    if (refreshToken) {
      await this.authService.logout(user.id, refreshToken);
    }

    if (res && typeof res.clearCookie === 'function') {
      res.clearCookie('haraka_refresh', { path: '/api/v1/auth/refresh' });
    }
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List active sessions' })
  async getSessions(@CurrentUser() user: AuthUser) {
    return { data: await this.authService.getSessions(user.id) };
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(@CurrentUser() user: AuthUser, @Param('id') sessionId: string) {
    await this.authService.revokeSession(user.id, sessionId);
  }

  private setRefreshCookie(res: FastifyReply, refreshToken: string): void {
    if (res && typeof res.setCookie === 'function') {
      res.setCookie('haraka_refresh', refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth/refresh',
        maxAge: 30 * 24 * 60 * 60,
      });
    }
  }
}
