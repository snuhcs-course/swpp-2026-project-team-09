import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// What the stack is made with for one run: keys, certificates and compose.env. Ignored by git.
export const STACK_FILES = fileURLToPath(new URL('../.stack/', import.meta.url));

// A project name of its own, so that a developer's stack, its ports and its volumes are left alone.
const PROJECT = 'snu-now-flow-tests';

// `docker compose` on the test stack, from the repository root. Its own messages go to the tests' output, and a
// failure carries what the command printed. It runs beside the tests' event loop, which keeps their connections.
export function compose(...args: string[]): Promise<string> {
  const files = ['--file', 'compose.yaml', '--file', 'flow-tests/compose.test.yaml'];
  const project = ['--project-name', PROJECT, '--env-file', `${STACK_FILES}compose.env`];
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
