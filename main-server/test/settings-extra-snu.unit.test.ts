/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// EXTRA_SNU_COLLECTION, the default of the global setting collection.extraSnu, apart from test/settings.unit.test.ts,
// which is at the length limit. It moved here from the worker's settings (P06-64).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { settingsSchema } from '../src/common/settings.js';
import { es256KeyPair } from './keys.js';

const example = parseEnv(readFileSync(fileURLToPath(new URL('../.env.example', import.meta.url)), 'utf8'));
const keys = es256KeyPair();
const valid: Record<string, string | undefined> = {
  ...example,
  ACCESS_TOKEN_PRIVATE_KEY: keys.privateKey,
  ACCESS_TOKEN_PUBLIC_KEY: keys.publicKey,
  KAKAO_REST_API_KEY: 'the-owners-kakao-rest-api-key',
  WORKER_TOKEN: '0123456789abcdef'.repeat(4),
};

describe('settingsSchema: EXTRA_SNU_COLLECTION', () => {
  it.each([
    ['unset', undefined, false],
    ['off', 'off', false],
    ['on', 'on', true],
  ])('%s → %s', (_as, value, on) => {
    expect(settingsSchema.parse({ ...valid, EXTRA_SNU_COLLECTION: value })).toMatchObject({ EXTRA_SNU_COLLECTION: on });
  });

  it.each(['true', 'ON', ''])('%j → refused, naming EXTRA_SNU_COLLECTION', (value) => {
    const result = settingsSchema.safeParse({ ...valid, EXTRA_SNU_COLLECTION: value });

    expect(result.error?.issues.map(({ path }) => path[0])).toEqual(['EXTRA_SNU_COLLECTION']);
  });
});
