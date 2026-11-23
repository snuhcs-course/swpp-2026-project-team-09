/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// LOG_FORMAT, apart from test/settings.unit.test.ts, which is at the length limit. Partitions: unset, each allowed value,
// another case, another word and an empty value.

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

describe('settingsSchema: LOG_FORMAT', () => {
  it.each([
    ['unset', undefined, 'text'],
    ['text', 'text', 'text'],
    ['json', 'json', 'json'],
  ])('%s → %s', (_as, value, format) => {
    expect(settingsSchema.parse({ ...valid, LOG_FORMAT: value })).toMatchObject({ LOG_FORMAT: format });
  });

  it.each(['JSON', 'pretty', ''])('%j → refused, naming LOG_FORMAT', (value) => {
    const result = settingsSchema.safeParse({ ...valid, LOG_FORMAT: value });

    expect(result.error?.issues.map(({ path }) => path[0])).toEqual(['LOG_FORMAT']);
  });
});
