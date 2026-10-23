import { Injectable, Inject, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import type Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.getClient().get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.getClient().setex(key, ttlSeconds, value);
      return;
    }
    await this.getClient().set(key, value);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) await this.getClient().del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.getClient().exists(key)) > 0;
  }

  async incr(key: string): Promise<number> {
    return this.getClient().incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.getClient().expire(key, seconds);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.getClient().publish(channel, message);
  }

  async ping(): Promise<string> {
    return this.getClient().ping();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status !== 'end') await this.redis.quit();
  }

  private getClient(): Redis {
    if (this.redis.status !== 'ready') {
      throw new ServiceUnavailableException('Redis is unavailable.');
    }
    return this.redis;
  }
}
