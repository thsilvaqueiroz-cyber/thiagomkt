import Redis from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL, {
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 200, 3000),
});

redis.on('error', (err) => {
  console.error('[Redis] Erro de conexão:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Conectado');
});

export async function getCache<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}

export async function setCache(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function deleteCache(key: string): Promise<void> {
  await redis.del(key);
}
