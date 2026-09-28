import { fileURLToPath } from 'node:url';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

// The same data stores as compose.yaml at the repository root, started fresh for the tests.

export async function startPostgres(): Promise<StartedTestContainer> {
  // The image is kept after the tests, so that the next run builds it from cache.
  const image = await GenericContainer.fromDockerfile(
    fileURLToPath(new URL('../../infra/postgres', import.meta.url)),
  ).build('snu-now-postgres-test', { deleteOnExit: false });
  return (
    image
      .withEnvironment({ POSTGRES_PASSWORD: 'postgres', MAIN_DB_PASSWORD: 'main', MATCH_DB_PASSWORD: 'match' })
      .withExposedPorts(5432)
      // The image logs this once while it creates the databases and once when it is ready.
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
      .start()
  );
}

export function mainDatabaseUrl(postgres: Readonly<StartedTestContainer>): string {
  return `postgresql://main:main@${postgres.getHost()}:${postgres.getMappedPort(5432)}/main`;
}

export function startRedis(): Promise<StartedTestContainer> {
  return new GenericContainer('redis:8')
    .withCommand(['redis-server', '--maxmemory-policy', 'noeviction'])
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start();
}

export function redisSettings(redis: Readonly<StartedTestContainer>): { REDIS_HOST: string; REDIS_PORT: string } {
  return { REDIS_HOST: redis.getHost(), REDIS_PORT: String(redis.getMappedPort(6379)) };
}
