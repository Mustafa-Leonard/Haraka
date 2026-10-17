import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
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
  async getReady() {
    let dbStatus = 'ok';
    let redisStatus = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'degraded';
    }

    try {
      const ping = await this.redis.get('health_ping');
    } catch {
      redisStatus = 'degraded';
    }

    return {
      status: dbStatus === 'ok' ? 'ready' : 'degraded',
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Comprehensive system health overview' })
  async getHealth() {
    return this.getReady();
  }
}
