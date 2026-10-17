import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        try {
          const { default: Redis } = await import('ioredis');
          const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
          const redis = new Redis(redisUrl, {
            password: config.get<string>('REDIS_PASSWORD') || undefined,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null, // don't loop endlessly if redis is not running
            lazyConnect: true,
          });

          redis.connect().catch((err) => {
            console.warn(`[RedisModule] Warning: Redis not reachable at ${redisUrl}. Real-time clustering will use in-memory mode.`);
          });

          return redis;
        } catch {
          return null;
        }
      },
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}
