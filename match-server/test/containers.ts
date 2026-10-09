/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { PrismaPg } from '@prisma/adapter-pg';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { PrismaClient } from '../src/generated/prisma/client.js';

// The same database as compose.yaml at the repository root, started fresh for the tests.

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

export function matchDatabaseUrl(postgres: StartedTestContainer): string {
  return `postgresql://match:match@${postgres.getHost()}:${postgres.getMappedPort(5432)}/match`;
}

// Brings the database up to the current schema.
export function migrate(databaseUrl: string): void {
  execFileSync('pnpm', ['db:migrate'], { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'inherit' });
}

export function connect(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

// A database of its own beside the shared one, at the current schema, for a test file whose rounds would otherwise
// group the requests of the other files. `drop()` removes it.
export async function createDatabase(sharedDatabaseUrl: string): Promise<{ url: string; drop: () => Promise<void> }> {
  const name = `rounds_${randomUUID().replaceAll('-', '')}`;
  const sharedDatabase = connect(sharedDatabaseUrl);
  await sharedDatabase.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  const url = new URL(sharedDatabaseUrl);
  url.pathname = `/${name}`;
  migrate(url.toString());
  return {
    url: url.toString(),
    drop: async (): Promise<void> => {
      await sharedDatabase.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
      await sharedDatabase.$disconnect();
    },
  };
}
