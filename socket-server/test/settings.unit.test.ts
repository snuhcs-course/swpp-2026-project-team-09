/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: each setting missing, malformed and on either side of its bound, and keys of each wrong kind (P09 spec,
// (a)). The valid settings come from .env.example and README.md's "Run it", the public key as main-server writes it.

import { generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { settingsSchema } from '../src/common/settings.js';
import { es256KeyPair, rsaKeyPair } from './keys.js';

type Values = Record<string, string | undefined>;

const example = parseEnv(readFileSync(fileURLToPath(new URL('../.env.example', import.meta.url)), 'utf8'));

// .env.example leaves ACCESS_TOKEN_PUBLIC_KEY to the line that main-server's `pnpm keys:generate` wrote.
const keys = es256KeyPair();
const valid: Values = { ...example, ACCESS_TOKEN_PUBLIC_KEY: keys.publicKey };

const p384PublicKey = generateKeyPairSync('ec', {
  namedCurve: 'P-384',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
}).publicKey;

// The settings a refusal names, as the start-up error prints them.
function refused(values: Values): string[] {
  const result = settingsSchema.safeParse(values);
  return result.success ? [] : [...new Set(result.error.issues.map(({ path }) => String(path[0])))];
}

describe('settingsSchema', () => {
  it(".env.example's settings with the main server's public key → accepted, the ports as numbers", () => {
    expect(settingsSchema.parse(valid)).toEqual({
      PORT: 3001,
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      ACCESS_TOKEN_PUBLIC_KEY: keys.publicKey,
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

describe('settingsSchema: REDIS_HOST', () => {
  it.each([
    ['missing', undefined],
    ['empty', ''],
  ])('%s → refused, naming REDIS_HOST', (_as, value) => {
    expect(refused({ ...valid, REDIS_HOST: value })).toEqual(['REDIS_HOST']);
  });
});

describe('settingsSchema: ACCESS_TOKEN_PUBLIC_KEY', () => {
  it.each([
    ['missing', undefined],
    ['not PEM text', 'not a key'],
    ['a private key, under the wrong PEM header', keys.privateKey],
    ['a P-384 key, on the wrong curve', p384PublicKey],
    ['an RSA key', rsaKeyPair().publicKey],
  ])('%s → refused, naming ACCESS_TOKEN_PUBLIC_KEY', (_as, value) => {
    expect(refused({ ...valid, ACCESS_TOKEN_PUBLIC_KEY: value })).toEqual(['ACCESS_TOKEN_PUBLIC_KEY']);
  });
});
