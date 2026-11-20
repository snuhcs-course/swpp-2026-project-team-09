/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-20  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// LLM_KEYS, the AI's keys by name, apart from test/settings.unit.test.ts, which is at the length limit. Partitions:
// none (unset, empty, {}), several keys, text that is not a JSON object, a name outside the pattern or `default`, and a
// key that is empty or not a string. No refusal may hold the key.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { settingsSchema } from '../src/common/settings.js';
import { es256KeyPair } from './keys.js';

const example = parseEnv(readFileSync(fileURLToPath(new URL('../.env.example', import.meta.url)), 'utf8'));
const pair = es256KeyPair();
const valid: Record<string, string | undefined> = {
  ...example,
  ACCESS_TOKEN_PRIVATE_KEY: pair.privateKey,
  ACCESS_TOKEN_PUBLIC_KEY: pair.publicKey,
  KAKAO_REST_API_KEY: 'the-owners-kakao-rest-api-key',
  WORKER_TOKEN: '0123456789abcdef'.repeat(4),
};

describe("settingsSchema: LLM_KEYS, the AI's keys by name", () => {
  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['{}', '{}'],
  ])('%s → no key', (_as, value) => {
    expect(settingsSchema.parse({ ...valid, LLM_KEYS: value }).LLM_KEYS).toEqual({});
  });

  it('several keys → each by its name', () => {
    const keys = { anthropic: 'sk-ant-api03-7f3c', 'or-backup': 'sk-or-v1-9e1d', 'team-2': 'sk-ant-api03-Zq9/x+b=' };

    expect(settingsSchema.parse({ ...valid, LLM_KEYS: JSON.stringify(keys) }).LLM_KEYS).toEqual(keys);
  });

  it.each([
    ['not JSON', '{anthropic: sk-ant-api03-7f3c}'],
    ['an array', '["sk-ant-api03-7f3c"]'],
    ['a string', '"sk-ant-api03-7f3c"'],
    ['a name with a capital', '{"Anthropic":"sk-ant-api03-7f3c"}'],
    ['a name with an underscore', '{"team_2":"sk-ant-api03-7f3c"}'],
    ['the name default', '{"default":"sk-ant-api03-7f3c"}'],
    ['an empty key', '{"anthropic":""}'],
    ['a key that is not a string', '{"anthropic":7}'],
  ])('%s → refused, naming LLM_KEYS and never the key', (_as, value) => {
    const result = settingsSchema.safeParse({ ...valid, LLM_KEYS: value });

    expect(result.success ? [] : [...new Set(result.error.issues.map(({ path }) => String(path[0])))]).toEqual([
      'LLM_KEYS',
    ]);
    expect(JSON.stringify(result.error?.issues)).not.toContain('sk-ant');
  });
});
