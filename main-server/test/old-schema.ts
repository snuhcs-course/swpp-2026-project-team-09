/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER = fileURLToPath(new URL('..', import.meta.url));

// Applies the migrations before `migration`, through a Prisma config of their own, so that a test can store rows of
// the old schema and then apply the rest with `migrate` from containers.ts. In node_modules, where the config finds
// `prisma/config`.
export function migrateBefore(databaseUrl: string, migration: string): void {
  const folder = mkdtempSync(join(SERVER, 'node_modules', '.migration-test-'));
  try {
    const migrations = join(SERVER, 'prisma', 'migrations');
    for (const entry of readdirSync(migrations).filter((name) => name < migration || name.endsWith('.toml'))) {
      cpSync(join(migrations, entry), join(folder, 'migrations', entry), { recursive: true });
    }
    const config = join(folder, 'prisma.config.ts');
    writeFileSync(
      config,
      `import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: ${JSON.stringify(join(SERVER, 'prisma', 'schema.prisma'))},
  migrations: { path: ${JSON.stringify(join(folder, 'migrations'))} },
  datasource: { url: ${JSON.stringify(databaseUrl)} },
});
`,
    );
    execFileSync('pnpm', ['prisma', 'migrate', 'deploy', '--config', config], { cwd: SERVER, stdio: 'inherit' });
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}
