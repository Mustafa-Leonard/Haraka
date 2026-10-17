import { Injectable, Inject, Optional } from '@nestjs/common';
import type Redis from 'ioredis';

@Injectable()
export class RedisService {
  private inMemoryFallback = new Map<string, { value: string; expiresAt?: number }>();

  constructor(@Optional() @Inject('REDIS_CLIENT') private readonly redis: Redis | null) {}

  async get(key: string): Promise<string | null> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        return await this.redis.get(key);
      } catch {
        // Fall back to memory
      }
    }
    const item = this.inMemoryFallback.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.inMemoryFallback.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        if (ttlSeconds) {
          await this.redis.setex(key, ttlSeconds, value);
        } else {
          await this.redis.set(key, value);
        }
        return;
      } catch {
        // Fall back to memory
      }
    }
    this.inMemoryFallback.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(...keys: string[]): Promise<void> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.del(...keys);
      } catch {
        // Fall back to memory
      }
    }
    for (const key of keys) {
      this.inMemoryFallback.delete(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  async incr(key: string): Promise<number> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        return await this.redis.incr(key);
      } catch {
        // Fall back to memory
      }
    }
    const current = parseInt((await this.get(key)) || '0', 10);
    const next = current + 1;
    await this.set(key, String(next));
    return next;
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.expire(key, seconds);
        return;
      } catch {
        // Fall back to memory
      }
    }
    const item = this.inMemoryFallback.get(key);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
    }
  }

  async publish(channel: string, message: string): Promise<void> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.publish(channel, message);
      } catch {
        // Fall through
      }
    }
  }
}
