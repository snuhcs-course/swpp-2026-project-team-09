import { execFileSync } from 'node:child_process';
import { TestProject } from 'vitest/node';
import { Settings } from '../src/common/settings.js';
import { matchDatabaseUrl, startPostgres } from './containers.js';

type SettingValues = Record<keyof Settings, string>;

declare module 'vitest' {
  export interface ProvidedContext {
    settings: SettingValues;
  }
}

// Starts PostgreSQL once for every test file and brings the empty match database up to the current schema.
export default async function setup({ provide }: TestProject): Promise<() => Promise<void>> {
  const postgres = await startPostgres();
  const settings: SettingValues = {
    PORT: '3003',
    DATABASE_URL: matchDatabaseUrl(postgres),
    // Not a secret: the helpers in test/main-server.ts send it as the main server does.
    MATCH_SERVER_TOKEN: 'test-match-server-token-of-32-characters',
  };
  execFileSync('pnpm', ['db:migrate'], {
    env: { ...process.env, DATABASE_URL: settings.DATABASE_URL },
    stdio: 'inherit',
  });
  provide('settings', settings);

  return async () => {
    await postgres.stop();
  };
}
