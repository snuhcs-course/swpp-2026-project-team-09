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
    // Not a secret: sendAsWorker(app, …) sends it as the worker does.
    WORKER_TOKEN: 'test-worker-token-of-thirty-two-characters',
    PUBLIC_URL: 'https://snunow.example',
    // Two, as for a development build and the demo build.
    ANDROID_CERTIFICATE_FINGERPRINTS: [
      'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C',
      '14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5',
    ].join(','),
    // Not reached: the tests give startApp a MatchServerStub from test/match-server.ts in the match server's place.
    MATCH_SERVER_URL: 'http://match-server:3003',
    MATCH_SERVER_TOKEN: 'test-match-server-token-of-32-characters',
  };
  migrate(settings.DATABASE_URL);
  await seed(settings.DATABASE_URL);
  provide('settings', settings);

  return async () => {
    await Promise.all([postgres.stop(), redis.stop()]);
  };
}
