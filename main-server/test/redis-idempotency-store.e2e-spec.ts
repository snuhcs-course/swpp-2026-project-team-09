// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by fyoon46, reviewed by TaeHyun79 in #12
import { IdempotencyStorage } from '@nestjs/idempotency';
import { idempotencyStoreContract } from '@nestjs/idempotency/testing';
import { Redis } from 'ioredis';
import { inject } from 'vitest';
import { RedisIdempotencyStore } from '../src/common/redis-idempotency.store.js';

// The contract that @nestjs/idempotency sets for every store, run against the test Redis. Redis expires records on its
// own clock, so the cases that wait for an expiry wait in real time.
describe('RedisIdempotencyStore', () => {
  let redis: Redis;
  let store: RedisIdempotencyStore;

  beforeAll(() => {
    const { REDIS_HOST, REDIS_PORT } = inject('settings');
    redis = new Redis({ host: REDIS_HOST, port: Number(REDIS_PORT) });
    store = new RedisIdempotencyStore(redis, new IdempotencyStorage());
  });

  afterAll(async () => {
    await redis.quit();
  });

  // One store for every case: each case uses keys of its own.
  const cases = idempotencyStoreContract(() => store, { concurrent: true });
  for (const { name, run } of cases) {
    it(name, run);
  }
});
