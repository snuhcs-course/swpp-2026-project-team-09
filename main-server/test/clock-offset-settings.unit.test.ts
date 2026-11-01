/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { settingsSchema } from '../src/common/settings.js';
import { es256KeyPair } from './keys.js';

// CLOCK_OFFSET_MINUTES, on .env.example's values; settings.unit.test.ts holds the rest.

type Values = Record<string, string | undefined>;

const example = parseEnv(readFileSync(fileURLToPath(new URL('../.env.example', import.meta.url)), 'utf8'));

const keys = es256KeyPair();
const valid: Values = {
  ...example,
  ACCESS_TOKEN_PRIVATE_KEY: keys.privateKey,
  ACCESS_TOKEN_PUBLIC_KEY: keys.publicKey,
  KAKAO_REST_API_KEY: 'the-owners-kakao-rest-api-key',
  WORKER_TOKEN: '0123456789abcdef'.repeat(4),
  MATCH_SERVER_TOKEN: 'fedcba9876543210'.repeat(4),
};

// The settings a refusal names, as the start-up error prints them.
function refused(values: Values): string[] {
  const result = settingsSchema.safeParse(values);
  return result.success ? [] : [...new Set(result.error.issues.map(({ path }) => String(path[0])))];
}

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
