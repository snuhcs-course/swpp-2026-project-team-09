// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by fyoon46, reviewed by TaeHyun79 in #16
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { once } from 'node:events';
import { inject } from 'vitest';
import { REDIS, RedisModule } from '../src/common/redis.module.js';
import { startProxy } from './proxy.js';

describe('RedisModule', () => {
  it('closes without waiting for a Redis that cannot be reached', { timeout: 30_000 }, async () => {
    const { REDIS_HOST, REDIS_PORT } = inject('settings');
    const proxy = await startProxy(REDIS_HOST, Number(REDIS_PORT));
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          skipProcessEnv: true,
          load: [(): Record<string, unknown> => ({ REDIS_HOST: '127.0.0.1', REDIS_PORT: proxy.port })],
        }),
        RedisModule,
      ],
    }).compile();
    const redis = moduleRef.get<Redis>(REDIS);
    await redis.ping();
    const reconnecting = once(redis, 'reconnecting');
    await proxy.stop();
    await reconnecting;
    // While Redis cannot be reached, a command waits in the client until Redis is back.
    void redis.get('key').catch(() => null);
    const closing = Date.now();

    await moduleRef.close();

    // quit() would wait behind that command for as long as the client keeps trying to reach Redis.
    expect(Date.now() - closing).toBeLessThan(5_000);
  });
});
