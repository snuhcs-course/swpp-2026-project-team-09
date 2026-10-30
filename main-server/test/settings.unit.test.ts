/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 * 2026-10-30  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

// Partitions: each setting missing; all but DATABASE_URL, REDIS_HOST and MATCH_SERVER_URL malformed or by a bound;
// keys of each wrong kind; lists with the wrong separator. Valid values and bounds: .env.example and README.md.

import { generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { settingsSchema } from '../src/common/settings.js';
import { es256KeyPair, rsaKeyPair } from './keys.js';

type Values = Record<string, string | undefined>;

const example = parseEnv(readFileSync(fileURLToPath(new URL('../.env.example', import.meta.url)), 'utf8'));

// What .env.example leaves to be made: the key pair of `pnpm keys:generate`, the two secrets of
// `openssl rand -hex 32` (64 hex digits) and the Owner's Kakao key.
const keys = es256KeyPair();
const valid: Values = {
  ...example,
  ACCESS_TOKEN_PRIVATE_KEY: keys.privateKey,
  ACCESS_TOKEN_PUBLIC_KEY: keys.publicKey,
  KAKAO_REST_API_KEY: 'the-owners-kakao-rest-api-key',
  WORKER_TOKEN: '0123456789abcdef'.repeat(4),
  MATCH_SERVER_TOKEN: 'fedcba9876543210'.repeat(4),
};

const p384 = generateKeyPairSync('ec', {
  namedCurve: 'P-384',
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const rsa = rsaKeyPair();
const otherPair = es256KeyPair();

// The SHA-256 fingerprint .env.example holds (the Expo template's debug key), and the SHA-1 of the same key.
const sha256 = 'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C';
const sha1 = '5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25';

// The settings a refusal names, as the start-up error prints them.
function refused(values: Values): string[] {
  const result = settingsSchema.safeParse(values);
  return result.success ? [] : [...new Set(result.error.issues.map(({ path }) => String(path[0])))];
}

describe('settingsSchema', () => {
  it(".env.example's settings with what it leaves to be made → accepted", () => {
    expect(settingsSchema.parse(valid)).toMatchObject({
      PORT: 3000,
      DATABASE_URL: 'postgresql://main:main@localhost:5432/main',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      INITIAL_ADMINISTRATOR_EMAILS: ['admin@example.com'],
      PUBLIC_URL: 'http://localhost:3000',
      ANDROID_CERTIFICATE_FINGERPRINTS: [sha256],
      MATCH_SERVER_URL: 'http://localhost:3003',
      ASSISTANT_MODEL: 'anthropic/claude-haiku-5.5',
    });
  });
});

describe.each(['PORT', 'REDIS_PORT'])('settingsSchema: %s', (setting) => {
  it.each([
    ['missing', undefined],
    ['abc', 'abc'],
    ['0', '0'],
    ['65536', '65536'],
  ])(`%s → refused, naming ${setting}`, (_as, value) => {
    expect(refused({ ...valid, [setting]: value })).toEqual([setting]);
  });

  it.each([
    ['1', 1],
    ['65535', 65535],
  ])('%s → accepted as %i', (value, port) => {
    expect(settingsSchema.parse({ ...valid, [setting]: value })).toMatchObject({ [setting]: port });
  });
});

describe.each(['DATABASE_URL', 'REDIS_HOST', 'MATCH_SERVER_URL'])('settingsSchema: %s', (setting) => {
  it(`missing → refused, naming ${setting}`, () => {
    expect(refused({ ...valid, [setting]: undefined })).toEqual([setting]);
  });
});

describe('settingsSchema: KAKAO_REST_API_KEY', () => {
  it.each([
    ['missing', undefined],
    ['empty, as in .env.example', ''],
  ])('%s → refused, naming KAKAO_REST_API_KEY', (_as, value) => {
    expect(refused({ ...valid, KAKAO_REST_API_KEY: value })).toEqual(['KAKAO_REST_API_KEY']);
  });
});

describe.each(['WORKER_TOKEN', 'MATCH_SERVER_TOKEN'])('settingsSchema: %s', (setting) => {
  it.each([
    ['missing', undefined],
    ['of 31 characters', 'a'.repeat(31)],
  ])(`%s → refused, naming ${setting}`, (_as, value) => {
    expect(refused({ ...valid, [setting]: value })).toEqual([setting]);
  });

  it('of 32 characters → accepted', () => {
    expect(refused({ ...valid, [setting]: 'a'.repeat(32) })).toEqual([]);
  });
});

describe('settingsSchema: ACCESS_TOKEN_PRIVATE_KEY', () => {
  it.each([
    ['missing', undefined],
    ['not PEM text', 'not a key'],
    ['a public key, under the wrong PEM header', keys.publicKey],
    ['a P-384 key, on the wrong curve', p384.privateKey],
    ['an RSA key', rsa.privateKey],
  ])('%s → refused, naming ACCESS_TOKEN_PRIVATE_KEY', (_as, value) => {
    expect(refused({ ...valid, ACCESS_TOKEN_PRIVATE_KEY: value })).toEqual(['ACCESS_TOKEN_PRIVATE_KEY']);
  });
});

describe('settingsSchema: ACCESS_TOKEN_PUBLIC_KEY', () => {
  it.each([
    ['missing', undefined],
    ['not PEM text', 'not a key'],
    ['the private key, under the wrong PEM header', keys.privateKey],
    ['a P-384 key, on the wrong curve', p384.publicKey],
    ['an RSA key', rsa.publicKey],
    ['the public key of another pair than the private key', otherPair.publicKey],
  ])('%s → refused, naming ACCESS_TOKEN_PUBLIC_KEY', (_as, value) => {
    expect(refused({ ...valid, ACCESS_TOKEN_PUBLIC_KEY: value })).toEqual(['ACCESS_TOKEN_PUBLIC_KEY']);
  });
});

describe.each(['GOOGLE_APP_CLIENT_ID', 'GOOGLE_ADMIN_CLIENT_ID'])('settingsSchema: %s', (setting) => {
  it.each([
    ['missing', undefined],
    ['not a client ID', 'secret'],
  ])(`%s → refused, naming ${setting}`, (_as, value) => {
    expect(refused({ ...valid, [setting]: value })).toEqual([setting]);
  });
});

describe('settingsSchema: the two Google client IDs', () => {
  it("the app's client ID as the admin site's → refused, naming GOOGLE_ADMIN_CLIENT_ID", () => {
    expect(refused({ ...valid, GOOGLE_ADMIN_CLIENT_ID: valid.GOOGLE_APP_CLIENT_ID })).toEqual([
      'GOOGLE_ADMIN_CLIENT_ID',
    ]);
  });
});

describe('settingsSchema: INITIAL_ADMINISTRATOR_EMAILS', () => {
  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['two addresses separated by a semicolon', 'admin@example.com;second-admin@example.com'],
  ])('%s → refused, naming INITIAL_ADMINISTRATOR_EMAILS', (_as, value) => {
    expect(refused({ ...valid, INITIAL_ADMINISTRATOR_EMAILS: value })).toEqual(['INITIAL_ADMINISTRATOR_EMAILS']);
  });

  it('two addresses separated by a comma, in capitals → accepted as each address in lower case', () => {
    const emails = 'Admin@Example.com, SECOND-ADMIN@example.com';

    expect(settingsSchema.parse({ ...valid, INITIAL_ADMINISTRATOR_EMAILS: emails })).toMatchObject({
      INITIAL_ADMINISTRATOR_EMAILS: ['admin@example.com', 'second-admin@example.com'],
    });
  });
});

describe('settingsSchema: PUBLIC_URL', () => {
  it.each([
    ['missing', undefined],
    ['an address without a scheme', 'snunow.example'],
  ])('%s → refused, naming PUBLIC_URL', (_as, value) => {
    expect(refused({ ...valid, PUBLIC_URL: value })).toEqual(['PUBLIC_URL']);
  });

  it.each([
    ['without a trailing slash', 'https://snunow.example'],
    ['with a trailing slash', 'https://snunow.example/'],
  ])('%s → accepted as https://snunow.example', (_as, value) => {
    expect(settingsSchema.parse({ ...valid, PUBLIC_URL: value })).toMatchObject({
      PUBLIC_URL: 'https://snunow.example',
    });
  });
});

describe('settingsSchema: ANDROID_CERTIFICATE_FINGERPRINTS', () => {
  it.each([
    ['missing', undefined],
    ['a SHA-1 fingerprint', sha1],
    ['two SHA-256 fingerprints separated by a semicolon', `${sha256};${sha256}`],
  ])('%s → refused, naming ANDROID_CERTIFICATE_FINGERPRINTS', (_as, value) => {
    expect(refused({ ...valid, ANDROID_CERTIFICATE_FINGERPRINTS: value })).toEqual([
      'ANDROID_CERTIFICATE_FINGERPRINTS',
    ]);
  });
});

describe("settingsSchema: the Assistant's settings", () => {
  it('unset → the defaults of .env.example, and no key or model', () => {
    const unset = { ...valid, OPENROUTER_API_KEY: undefined, ASSISTANT_MODEL: undefined };

    expect(settingsSchema.parse(unset)).toMatchObject({
      OPENROUTER_API_KEY: '',
      ASSISTANT_MODEL: '',
      ASSISTANT_DAILY_MESSAGES: 50,
      ASSISTANT_MAX_STEPS: 8,
      ASSISTANT_TIMEOUT_MS: 30_000,
      ASSISTANT_MAX_OUTPUT_TOKENS: 1000,
    });
  });

  describe.each([
    'ASSISTANT_DAILY_MESSAGES',
    'ASSISTANT_MAX_STEPS',
    'ASSISTANT_TIMEOUT_MS',
    'ASSISTANT_MAX_OUTPUT_TOKENS',
  ])('%s', (setting) => {
    it(`0 → refused, naming ${setting}`, () => {
      expect(refused({ ...valid, [setting]: '0' })).toEqual([setting]);
    });

    it('1 → accepted as 1', () => {
      expect(settingsSchema.parse({ ...valid, [setting]: '1' })).toMatchObject({ [setting]: 1 });
    });
  });
});

describe('settingsSchema: the clock offset', () => {
  it('missing → 0', () => {
    expect(settingsSchema.parse(valid)).toMatchObject({ CLOCK_OFFSET_MINUTES: 0 });
  });

  it('-90 on localhost → accepted as -90', () => {
    expect(settingsSchema.parse({ ...valid, CLOCK_OFFSET_MINUTES: '-90' })).toMatchObject({
      CLOCK_OFFSET_MINUTES: -90,
    });
  });

  it('120 with a PUBLIC_URL that is not localhost → refused, naming it', () => {
    expect(refused({ ...valid, PUBLIC_URL: 'https://snunow.example', CLOCK_OFFSET_MINUTES: '120' })).toEqual([
      'CLOCK_OFFSET_MINUTES',
    ]);
  });

  it('0 with a PUBLIC_URL that is not localhost → accepted', () => {
    expect(settingsSchema.parse({ ...valid, PUBLIC_URL: 'https://snunow.example' })).toMatchObject({
      CLOCK_OFFSET_MINUTES: 0,
    });
  });

  it.each(['1.5', 'abc'])('%s → refused, naming it', (value) => {
    expect(refused({ ...valid, CLOCK_OFFSET_MINUTES: value })).toEqual(['CLOCK_OFFSET_MINUTES']);
  });
});
