/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { IdempotencyStorage } from '@nestjs/idempotency';
import { idempotencyStoreContract } from '@nestjs/idempotency/testing';
import { Redis } from 'ioredis';
import { StartedTestContainer } from 'testcontainers';
import { RedisIdempotencyStore } from '../src/common/redis-idempotency.store.js';
import { redisSettings, startRedis } from './containers.js';

// The contract that @nestjs/idempotency sets for every store. Its project runs after the others, so it starts a Redis
// of its own: the integration project's global setup provides its settings to that project only. Redis expires records
// on its own clock, so the cases that wait for an expiry wait in real time.
describe('RedisIdempotencyStore', () => {
  let container: StartedTestContainer;
  let redis: Redis;
  let store: RedisIdempotencyStore;

  beforeAll(async () => {
    container = await startRedis();
    const { REDIS_HOST, REDIS_PORT } = redisSettings(container);
    redis = new Redis({ host: REDIS_HOST, port: Number(REDIS_PORT) });
    store = new RedisIdempotencyStore(redis, new IdempotencyStorage());
  });

  afterAll(async () => {
    await redis.quit();
    await container.stop();
  });

  // One store for every case: each case uses keys of its own.
  const cases = idempotencyStoreContract(() => store, { concurrent: true });
  for (const { name, run } of cases) {
    it(name, run);
  }
});
