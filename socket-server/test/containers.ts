// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by fyoon46, reviewed by TaeHyun79 in #6 #10
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

// The same Redis as compose.yaml at the repository root, started fresh for the tests.

export function startRedis(): Promise<StartedTestContainer> {
  return new GenericContainer('redis:8')
    .withCommand(['redis-server', '--maxmemory-policy', 'noeviction'])
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start();
}

export function redisSettings(redis: StartedTestContainer): { REDIS_HOST: string; REDIS_PORT: string } {
  return { REDIS_HOST: redis.getHost(), REDIS_PORT: String(redis.getMappedPort(6379)) };
}
