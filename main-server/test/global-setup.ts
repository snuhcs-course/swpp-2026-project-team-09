import { execFileSync } from 'node:child_process';
import { TestProject } from 'vitest/node';
import { Settings } from '../src/common/settings.js';
import { mainDatabaseUrl, redisSettings, startPostgres, startRedis } from './containers.js';
import { es256KeyPair } from './keys.js';

type SettingValues = Record<keyof Settings, string>;

declare module 'vitest' {
  export interface ProvidedContext {
    settings: SettingValues;
  }
}

// Starts PostgreSQL and Redis once for every test file and brings the empty main database up to the current schema.
export default async function setup({ provide }: TestProject): Promise<() => Promise<void>> {
  const [postgres, redis] = await Promise.all([startPostgres(), startRedis()]);
  const accessTokenKeys = es256KeyPair();
  const settings: SettingValues = {
    PORT: '3000',
    DATABASE_URL: mainDatabaseUrl(postgres),
    ...redisSettings(redis),
    ACCESS_TOKEN_PRIVATE_KEY: accessTokenKeys.privateKey,
    ACCESS_TOKEN_PUBLIC_KEY: accessTokenKeys.publicKey,
    // The app's client and the admin site's client.
    GOOGLE_CLIENT_IDS: 'snu-now-app.apps.googleusercontent.com,snu-now-admin.apps.googleusercontent.com',
    ADMINISTRATOR_EMAILS: 'admin@snu.ac.kr',
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
