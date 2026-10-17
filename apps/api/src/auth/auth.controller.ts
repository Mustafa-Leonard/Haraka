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
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from '@haraka/shared-types';
import { otpRequestSchema, otpVerifySchema } from '@haraka/validation';
import { ZodBody } from '../common/decorators/zod-body.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request an OTP code via SMS' })
  @ApiResponse({ status: 200, description: 'OTP sent (non-enumerating response)' })
  async requestOtp(
    @ZodBody(otpRequestSchema) body: { phone: string; purpose?: string },
    @Req() req: FastifyRequest,
  ) {
    await this.authService.requestOtp(body.phone, body.purpose ?? 'auth', req.ip ?? '');
    return { message: 'If a valid number was provided, an OTP has been sent.' };
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and receive tokens' })
  async verifyOtp(
    @ZodBody(otpVerifySchema) body: { phone: string; code: string; purpose?: string },
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.verifyOtp(
      body.phone,
      body.code,
      body.purpose ?? 'auth',
      req.ip ?? '',
      (req.headers['user-agent'] as string) ?? '',
    );

    if (res && typeof res.setCookie === 'function') {
      res.setCookie('haraka_refresh', result.refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth/refresh',
        maxAge: 30 * 24 * 60 * 60,
      });
    }

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
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
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

    if (res && typeof res.setCookie === 'function') {
      res.setCookie('haraka_refresh', result.refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth/refresh',
        maxAge: 30 * 24 * 60 * 60,
      });
    }

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
  async revokeSession(
    @CurrentUser() user: AuthUser,
    @Param('id') sessionId: string,
  ) {
    await this.authService.revokeSession(user.id, sessionId);
  }
}
