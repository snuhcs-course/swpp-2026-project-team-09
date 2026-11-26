/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// POSTHOG_PROJECT_TOKEN, apart from test/settings.unit.test.ts, which is at the length limit. Partitions: unset, empty,
// a token of the shape, and values of other shapes, whose refusal never repeats them.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { settingsSchema } from '../src/common/settings.js';
import { es256KeyPair } from './keys.js';
import { POSTHOG_TOKEN } from './usage.js';

const example = parseEnv(readFileSync(fileURLToPath(new URL('../.env.example', import.meta.url)), 'utf8'));
const keys = es256KeyPair();
const valid: Record<string, string | undefined> = {
  ...example,
  ACCESS_TOKEN_PRIVATE_KEY: keys.privateKey,
  ACCESS_TOKEN_PUBLIC_KEY: keys.publicKey,
  KAKAO_REST_API_KEY: 'the-owners-kakao-rest-api-key',
  WORKER_TOKEN: '0123456789abcdef'.repeat(4),
};

describe('settingsSchema: POSTHOG_PROJECT_TOKEN', () => {
  it.each([
    ['unset', undefined, ''],
    ['empty', '', ''],
    ['a project token', POSTHOG_TOKEN, POSTHOG_TOKEN],
  ])('%s → %j', (_as, value, token) => {
    expect(settingsSchema.parse({ ...valid, POSTHOG_PROJECT_TOKEN: value })).toMatchObject({
      POSTHOG_PROJECT_TOKEN: token,
    });
  });

  it.each([
    ['a personal API key', 'phx_secretPersonalKey0123456789'],
    ['no prefix', 'secretTokenWithoutPrefix0123'],
    ['the prefix alone', 'phc_'],
    ['a space in it', 'phc_secret token0123'],
  ])('%s → refused, naming POSTHOG_PROJECT_TOKEN and not repeating the value', (_as, value) => {
    const result = settingsSchema.safeParse({ ...valid, POSTHOG_PROJECT_TOKEN: value });

    expect(result.error?.issues.map(({ path }) => path[0])).toEqual(['POSTHOG_PROJECT_TOKEN']);
    expect(JSON.stringify(result.error?.issues)).not.toContain(value);
    expect(result.error?.message).not.toContain(value);
  });
});
