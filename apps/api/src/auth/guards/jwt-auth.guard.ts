import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import type { JwtPayload, AuthUser } from '@haraka/shared-types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    try {
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_SECRET', 'dev_jwt_secret_must_be_changed_in_production_32bytes_min'),
      });

      // Verify user exists and is active
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive || user.isSuspended) {
        throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'User account inactive or suspended' });
      }

      const authUser: AuthUser = {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        roles: user.roles as string[],
        preferredLanguage: user.preferredLanguage,
        isActive: user.isActive,
        isSuspended: user.isSuspended,
      };

      request['user'] = authUser;
      request['sessionId'] = payload.sessionId;
      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
    }
  }

  private extractToken(request: any): string | undefined {
    const auth = request.headers?.['authorization'] as string | undefined;
    if (auth?.startsWith('Bearer ')) {
      return auth.slice(7);
    }
    return undefined;
  }
}
