/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// A Compose stack the tests start, under a project name of its own so that a developer's stack is left alone. Its
// settings folder (settings.ts) holds the compose.env that is its --env-file.
export interface Stack {
  project: string;
  files: string[];
  settings: string;
}

// The flow stack. Its settings folder is ignored by git.
export const FLOW_STACK: Stack = {
  project: 'snu-now-flow-tests',
  files: ['compose.yaml', 'flow-tests/compose.test.yaml'],
  settings: fileURLToPath(new URL('../.stack/', import.meta.url)),
};

// `docker compose` on the stack named first, or else on the flow stack, from the repository root. Its own messages go to
// the tests' output, and a failure carries what the command printed. It runs beside the tests' event loop, which keeps
// their connections.
export function compose(...args: string[]): Promise<string>;
export function compose(stack: Stack, ...args: string[]): Promise<string>;
export function compose(first: Stack | string, ...rest: string[]): Promise<string> {
  const [stack, args] = typeof first === 'string' ? [FLOW_STACK, [first, ...rest]] : [first, rest];
  const project = ['--project-name', stack.project, '--env-file', join(stack.settings, 'compose.env')];
  const files = stack.files.flatMap((file) => ['--file', file]);
  const command = spawn('docker', ['compose', ...project, ...files, ...args], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  let printed = '';
  command.stdout.setEncoding('utf8').on('data', (chunk: string) => {
    printed += chunk;
  });
  return new Promise((resolve, reject) => {
    command.on('error', reject);
    command.on('close', (status) => {
      if (status === 0) {
        resolve(printed);
      } else {
        reject(new Error(`docker compose ${args.join(' ')} exited with ${String(status)}:\n${printed}`));
      }
    });
  });
}

async function removeStack(stack: Stack): Promise<void> {
  await compose(stack, 'down', '--volumes', '--remove-orphans');
}

// Builds and starts the stack and waits until every service is ready. Answers what removes it with its volumes.
export async function startStack(stack: Stack): Promise<() => Promise<void>> {
  // A stack that an interrupted run left would keep the files it started with.
  await removeStack(stack);
  try {
    await compose(stack, 'up', '--build', '--wait', '--wait-timeout', '900');
  } catch (error) {
    console.error(await compose(stack, 'logs', '--no-color', '--tail', '100'));
    await removeStack(stack);
    throw error;
  }
  return () => removeStack(stack);
}

// Where on the loopback the stack publishes a service's port.
export async function published(stack: Stack, service: string, port: number): Promise<string> {
  return `http://${(await compose(stack, 'port', service, String(port))).trim()}`;
}

// Every table but the seed's, the Administrators' and the migrations'. PostGIS keeps spatial_ref_sys in the schema.
function emptyTables(kept: string[]): string {
  const keptList = ['_prisma_migrations', 'spatial_ref_sys', ...kept].map((table) => `'${table}'`).join(', ');
  return `DO $$ DECLARE tables text; BEGIN
    SELECT string_agg(format('%I', tablename), ', ') INTO tables FROM pg_tables
      WHERE schemaname = 'public' AND tablename NOT IN (${keptList});
    IF tables IS NOT NULL THEN EXECUTE 'TRUNCATE ' || tables || ' CASCADE'; END IF;
  END $$;`;
}

async function psql(database: string, command: string): Promise<void> {
  await compose(
    'exec',
    '-T',
    'postgres',
    'psql',
    '--username=postgres',
    `--dbname=${database}`,
    '--quiet',
    '--command',
    command,
  );
}

// Each test starts from an empty state: what earlier tests made is gone from both databases and from Redis.
export async function emptyState(): Promise<void> {
  await Promise.all([
    psql('main', emptyTables(['places', 'shuttle_routes', 'shuttle_stops', 'administrators'])),
    psql('match', emptyTables([])),
    compose('exec', '-T', 'redis', 'redis-cli', 'FLUSHALL'),
  ]);
}

// Runs a Collection of the Sources named by hand, as `pnpm collect` does, and fails when one of them failed.
export async function workerCollects(...sources: string[]): Promise<void> {
  await compose('exec', '-T', 'worker-server', 'node', 'dist/collect', ...sources);
}
