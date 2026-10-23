import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redis = new Redis(config.getOrThrow<string>('REDIS_URL'), {
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: 1,
          retryStrategy: (attempt) => (attempt < 5 ? Math.min(attempt * 250, 1000) : null),
          lazyConnect: true,
        });
        await redis.connect();
        return redis;
      },
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}
