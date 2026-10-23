import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { PrismaService } from '../common/database/prisma.service';
import { RedisService } from '../common/redis/redis.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('health/live')
  @ApiOperation({ summary: 'Liveness probe' })
  getLive() {
    return { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe checking database and redis' })
  async getReady(@Res({ passthrough: true }) reply: FastifyReply) {
    const [database, redis] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(
        () => 'ok' as const,
        () => 'degraded' as const,
      ),
      this.redis.ping().then(
        () => 'ok' as const,
        () => 'degraded' as const,
      ),
    ]);
    const status = database === 'ok' && redis === 'ok' ? 'ready' : 'degraded';
    reply.status(status === 'ready' ? 200 : 503);

    return {
      status,
      services: {
        database,
        redis,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Comprehensive system health overview' })
  async getHealth(@Res({ passthrough: true }) reply: FastifyReply) {
    return this.getReady(reply);
  }
}
