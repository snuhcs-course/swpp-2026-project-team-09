import { PrismaPg } from '@prisma/adapter-pg';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { loadSeed } from '../src/load-seed.js';

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

export function mainDatabaseUrl(postgres: StartedTestContainer): string {
  return `postgresql://main:main@${postgres.getHost()}:${postgres.getMappedPort(5432)}/main`;
}

export function migrate(databaseUrl: string): void {
  execFileSync('pnpm', ['db:migrate'], { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'inherit' });
}

export function connect(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

// A database of its own beside the shared one, at the current schema, for a test file that loads a seed: what it loads
// reaches no other test. `drop()` removes it.
export async function createDatabase(
  sharedDatabaseUrl: string,
): Promise<{ prisma: PrismaClient; drop: () => Promise<void> }> {
  const name = `seed_${randomUUID().replaceAll('-', '')}`;
  const sharedDatabase = connect(sharedDatabaseUrl);
  await sharedDatabase.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  const url = new URL(sharedDatabaseUrl);
  url.pathname = `/${name}`;
  migrate(url.toString());
  const prisma = connect(url.toString());
  return {
    prisma,
    drop: async (): Promise<void> => {
      await prisma.$disconnect();
      await sharedDatabase.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
      await sharedDatabase.$disconnect();
    },
  };
}

// What `pnpm db:seed` does, without building the server first.
export async function seed(databaseUrl: string): Promise<void> {
  const prisma = connect(databaseUrl);
  try {
    await loadSeed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

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
