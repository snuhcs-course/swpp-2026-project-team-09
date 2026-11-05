/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The model's settings (spec A01): the provider, its caching mode, and the chosen provider's key and model that the
// Judgement and the same-event choice need when they are on. Partitions: each provider with its key and model, each
// missing, and only the other provider's key; each value of MODEL_PROVIDER and MODEL_CACHE and one outside them.

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

describe('settingsSchema: the model', () => {
  it(".env.example's → the Anthropic API with its model, caching by breakpoints", () => {
    expect(settingsSchema.parse(valid)).toMatchObject({
      MODEL_PROVIDER: 'anthropic',
      ANTHROPIC_MODEL: 'claude-haiku-5-5',
      MODEL_CACHE: 'breakpoints',
      ASSISTANT_MODEL: 'anthropic/claude-haiku-5.5',
    });
  });

  it('unset → anthropic, breakpoints, and no key or model', () => {
    const unset = {
      ...valid,
      MODEL_PROVIDER: undefined,
      MODEL_CACHE: undefined,
      ANTHROPIC_API_KEY: undefined,
      ANTHROPIC_MODEL: undefined,
    };

    expect(settingsSchema.parse(unset)).toMatchObject({
      MODEL_PROVIDER: 'anthropic',
      MODEL_CACHE: 'breakpoints',
      ANTHROPIC_API_KEY: '',
      ANTHROPIC_MODEL: '',
    });
  });
});

describe.each([
  ['MODEL_PROVIDER', ['anthropic', 'openrouter'], 'claude'],
  ['MODEL_CACHE', ['breakpoints', 'auto', 'off'], 'on'],
])('settingsSchema: %s', (setting, values, other) => {
  it.each(values)('%s → accepted', (value) => {
    expect(settingsSchema.parse({ ...valid, [setting]: value })).toMatchObject({ [setting]: value });
  });

  it(`${other} → refused, naming ${setting}`, () => {
    expect(refused({ ...valid, [setting]: other })).toEqual([setting]);
  });
});

// Each provider with the settings of its key and its model.
const PROVIDER_SETTINGS = [
  ['anthropic', 'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL'],
  ['openrouter', 'OPENROUTER_API_KEY', 'ASSISTANT_MODEL'],
] as const;

const WITHOUT_ONE = PROVIDER_SETTINGS.flatMap(([provider, key, model]) =>
  [key, model].map((name) => [provider, name, key] as const),
);

describe.each(['AUTOMATIC_JUDGEMENT', 'SAME_EVENT_AI_CHOICE'])('settingsSchema: %s on', (step) => {
  it.each(PROVIDER_SETTINGS)('through %s with its key and model → on', (provider, key) => {
    const values = { ...valid, [step]: 'on', MODEL_PROVIDER: provider, [key]: 'key' };

    expect(settingsSchema.parse(values)).toMatchObject({ [step]: true });
  });

  it.each(WITHOUT_ONE)(`through %s without %s → refused, naming ${step}`, (provider, name, key) => {
    const without = { ...valid, [step]: 'on', MODEL_PROVIDER: provider, [key]: 'key', [name]: '' };

    expect(refused(without)).toEqual([step]);
  });

  it(`through anthropic with only OpenRouter's key → refused, naming ${step}`, () => {
    const without = { ...valid, [step]: 'on', ANTHROPIC_API_KEY: '', OPENROUTER_API_KEY: 'key' };

    expect(refused(without)).toEqual([step]);
  });
});
