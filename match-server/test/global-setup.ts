/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { TestProject } from 'vitest/node';
import { Settings } from '../src/common/settings.js';
import { matchDatabaseUrl, migrate, startPostgres } from './containers.js';

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
    // Not reached: startApp gives the server a MainServerStub from test/main-server.ts in the main server's place.
    MAIN_SERVER_URL: 'http://main-server:3000',
    // No round runs by itself during the tests, which run them with runRound() in test/main-server.ts.
    ROUND_INTERVAL_SECONDS: '3600',
  };
  migrate(settings.DATABASE_URL);
  provide('settings', settings);

  return async () => {
    await postgres.stop();
  };
}
