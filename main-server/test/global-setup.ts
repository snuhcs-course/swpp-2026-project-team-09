/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by fyoon46
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

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

// Two, as for a development build and the demo build.
const ANDROID_FINGERPRINTS = [
  'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C',
  '14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5',
].join(',');

// The Assistant's defaults. A test of a limit starts an app with a smaller one.
const ASSISTANT_DEFAULTS = {
  ASSISTANT_DAILY_MESSAGES: '50',
  ASSISTANT_MAX_STEPS: '8',
  ASSISTANT_TIMEOUT_MS: '30000',
  ASSISTANT_MAX_OUTPUT_TOKENS: '1000',
  ASSISTANT_INDUCED_RULES: 'true',
  ASSISTANT_INDUCTION_BUDGET: '12',
  ASSISTANT_REFLECTOR_MODEL: '',
  ASSISTANT_GLOBAL_ALIASES: 'true',
  ASSISTANT_ALIAS_HOLDBACK_PERCENT: '10',
  // No account is held back, so that every test's User gets the whole score. A test of the holdback starts an app with
  // 100.
  ASSISTANT_SUGGESTION_HOLDBACK_PERCENT: '0',
};

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
    ANDROID_CERTIFICATE_FINGERPRINTS: ANDROID_FINGERPRINTS,
    // Not reached: the tests give startApp a MatchServerStub from test/match-server.ts in the match server's place.
    MATCH_SERVER_URL: 'http://match-server:3003',
    MATCH_SERVER_TOKEN: 'test-match-server-token-of-32-characters',
    // Not a key: the tests give startApp a ScriptedModel from test/scripted-model.ts in the model's place.
    OPENROUTER_API_KEY: 'test-openrouter-api-key',
    ASSISTANT_MODEL: 'test/model',
    ...ASSISTANT_DEFAULTS,
    AUTOMATIC_PUBLICATION: 'on',
    AUTOMATIC_JUDGEMENT: 'off',
    SAME_EVENT_TITLE_RULE: 'off',
    SAME_EVENT_AI_CHOICE: 'off',
    JUDGEMENT_TIMEOUT_MS: '60000',
    JUDGEMENT_MAX_OUTPUT_TOKENS: '4000',
    LIBRARY_BOOKING_ENABLED: 'true',
  };
  migrate(settings.DATABASE_URL);
  await seed(settings.DATABASE_URL);
  provide('settings', settings);

  return async () => {
    await Promise.all([postgres.stop(), redis.stop()]);
  };
}
