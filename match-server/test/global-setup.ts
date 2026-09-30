import { execFileSync } from 'node:child_process';
import { TestProject } from 'vitest/node';
import { Settings } from '../src/common/settings.js';
import { matchDatabaseUrl, redisSettings, startPostgres, startRedis } from './containers.js';

type SettingValues = Record<keyof Settings, string>;

declare module 'vitest' {
  export interface ProvidedContext {
    settings: SettingValues;
  }
}

// Starts PostgreSQL and Redis once for every test file and brings the empty match database up to the current schema.
export default async function setup({ provide }: TestProject): Promise<() => Promise<void>> {
  const [postgres, redis] = await Promise.all([startPostgres(), startRedis()]);
  const settings: SettingValues = {
    PORT: '3003',
    DATABASE_URL: matchDatabaseUrl(postgres),
    ...redisSettings(redis),
  };
  execFileSync('pnpm', ['db:migrate'], {
    env: { ...process.env, DATABASE_URL: settings.DATABASE_URL },
    stdio: 'inherit',
  });
  provide('settings', settings);

  return async () => {
    await Promise.all([postgres.stop(), redis.stop()]);
  };
}
