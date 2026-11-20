/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-20  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// NOTIFICATIONS_TICK_SECONDS, apart from test/settings.unit.test.ts, which is at the length limit. Partitions: unset,
// each bound, below and above them, a fraction, a non-number, and an empty value, which would otherwise read as 0.

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

describe('settingsSchema: NOTIFICATIONS_TICK_SECONDS', () => {
  it.each([
    ['unset', undefined, 15],
    ['0', '0', 0],
    ['3600', '3600', 3600],
  ])('%s → accepted as %d', (_as, value, seconds) => {
    expect(settingsSchema.parse({ ...valid, NOTIFICATIONS_TICK_SECONDS: value })).toMatchObject({
      NOTIFICATIONS_TICK_SECONDS: seconds,
    });
  });

  it.each(['-1', '3601', '1.5', 'abc', '', ' '])('"%s" → refused, naming NOTIFICATIONS_TICK_SECONDS', (value) => {
    const result = settingsSchema.safeParse({ ...valid, NOTIFICATIONS_TICK_SECONDS: value });

    expect(result.success ? [] : result.error.issues.map(({ path }) => String(path[0]))).toEqual([
      'NOTIFICATIONS_TICK_SECONDS',
    ]);
  });
});
