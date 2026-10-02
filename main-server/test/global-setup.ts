import { TestProject } from 'vitest/node';
import { Settings } from '../src/common/settings.js';
import { mainDatabaseUrl, migrate, redisSettings, seed, startPostgres, startRedis } from './containers.js';
import { es256KeyPair } from './keys.js';

type SettingValues = Record<keyof Settings, string>;

declare module 'vitest' {
  export interface ProvidedContext {
    settings: SettingValues;
  }
}

// Starts PostgreSQL and Redis once for every test file, brings the empty main database up to the current schema and
// loads the seed into it.
export default async function setup({ provide }: TestProject): Promise<() => Promise<void>> {
  const [postgres, redis] = await Promise.all([startPostgres(), startRedis()]);
  const accessTokenKeys = es256KeyPair();
  const settings: SettingValues = {
    PORT: '3000',
    DATABASE_URL: mainDatabaseUrl(postgres),
    ...redisSettings(redis),
    ACCESS_TOKEN_PRIVATE_KEY: accessTokenKeys.privateKey,
    ACCESS_TOKEN_PUBLIC_KEY: accessTokenKeys.publicKey,
    GOOGLE_APP_CLIENT_ID: 'snu-now-app.apps.googleusercontent.com',
    GOOGLE_ADMIN_CLIENT_ID: 'snu-now-admin.apps.googleusercontent.com',
    // signInAsAdministrator(app) signs in as this one.
    INITIAL_ADMINISTRATOR_EMAILS: 'admin@example.com',
    // Not a key: the tests never call Kakao.
    KAKAO_REST_API_KEY: 'test-kakao-rest-api-key',
  };
  migrate(settings.DATABASE_URL);
  await seed(settings.DATABASE_URL);
  provide('settings', settings);

  return async () => {
    await Promise.all([postgres.stop(), redis.stop()]);
  };
}
