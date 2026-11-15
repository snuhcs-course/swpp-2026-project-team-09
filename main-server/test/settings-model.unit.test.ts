/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The model's settings (specs A01 and A02): the caching mode, and the key that the Judgement and the same-event choice
// need when they are on. Partitions: OPENROUTER_API_KEY, a key in LLM_KEYS of either provider, only a key whose prefix
// names no provider, and none; each value of MODEL_CACHE and one outside them.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { settingsSchema } from '../src/common/settings.js';
import { es256KeyPair } from './keys.js';

type Values = Record<string, string | undefined>;

// .env.example with what it leaves to be made, as test/settings.unit.test.ts builds it.
const keys = es256KeyPair();
const valid: Values = {
  ...parseEnv(readFileSync(fileURLToPath(new URL('../.env.example', import.meta.url)), 'utf8')),
  ACCESS_TOKEN_PRIVATE_KEY: keys.privateKey,
  ACCESS_TOKEN_PUBLIC_KEY: keys.publicKey,
  KAKAO_REST_API_KEY: 'the-owners-kakao-rest-api-key',
  WORKER_TOKEN: '0123456789abcdef'.repeat(4),
  MATCH_SERVER_TOKEN: 'fedcba9876543210'.repeat(4),
};

function refused(values: Values): string[] {
  const result = settingsSchema.safeParse(values);
  return result.success ? [] : [...new Set(result.error.issues.map(({ path }) => String(path[0])))];
}

describe('settingsSchema: MODEL_CACHE', () => {
  it('unset → breakpoints', () => {
    expect(settingsSchema.parse({ ...valid, MODEL_CACHE: undefined })).toMatchObject({ MODEL_CACHE: 'breakpoints' });
  });

  it.each(['breakpoints', 'auto', 'off'])('%s → accepted', (value) => {
    expect(settingsSchema.parse({ ...valid, MODEL_CACHE: value })).toMatchObject({ MODEL_CACHE: value });
  });

  it('on → refused, naming MODEL_CACHE', () => {
    expect(refused({ ...valid, MODEL_CACHE: 'on' })).toEqual(['MODEL_CACHE']);
  });
});

describe.each(['AUTOMATIC_JUDGEMENT', 'SAME_EVENT_AI_CHOICE'])('settingsSchema: %s on', (step) => {
  it.each([
    ['OPENROUTER_API_KEY', { OPENROUTER_API_KEY: 'sk-or-v1-key', LLM_KEYS: '{}' }],
    ['an Anthropic key in LLM_KEYS', { OPENROUTER_API_KEY: '', LLM_KEYS: '{"claude":"sk-ant-key"}' }],
    ['an OpenRouter key in LLM_KEYS', { OPENROUTER_API_KEY: '', LLM_KEYS: '{"spare":"sk-or-v1-key"}' }],
  ])('with %s → on', (_with, given) => {
    expect(settingsSchema.parse({ ...valid, [step]: 'on', ...given })).toMatchObject({ [step]: true });
  });

  it.each([
    ['no key', { OPENROUTER_API_KEY: '', LLM_KEYS: '{}' }],
    ['only keys whose prefix names no provider', { OPENROUTER_API_KEY: 'key', LLM_KEYS: '{"odd":"key"}' }],
  ])(`with %s → refused, naming ${step}`, (_with, given) => {
    expect(refused({ ...valid, [step]: 'on', ...given })).toEqual([step]);
  });
});
