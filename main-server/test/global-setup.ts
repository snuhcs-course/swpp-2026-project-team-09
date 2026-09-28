import { execFileSync } from 'node:child_process';
import { TestProject } from 'vitest/node';
import { Settings } from '../src/common/settings.js';
import { mainDatabaseUrl, redisSettings, startPostgres, startRedis } from './containers.js';

type SettingValues = Record<keyof Settings, string>;

declare module 'vitest' {
  export interface ProvidedContext {
    settings: SettingValues;
  }
}

// Starts PostgreSQL and Redis once for every test file and brings the empty main database up to the current schema.
export default async function setup({ provide }: Readonly<Pick<TestProject, 'provide'>>): Promise<() => Promise<void>> {
  const [postgres, redis] = await Promise.all([startPostgres(), startRedis()]);
  const settings: SettingValues = {
    PORT: '3000',
    DATABASE_URL: mainDatabaseUrl(postgres),
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
