/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 * 2026-11-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { settingsSchema } from '../src/common/settings.js';
import { es256KeyPair } from './keys.js';

// The Assistant's settings and those of what it learns (P07), on .env.example's values; settings.unit.test.ts holds
// the rest.

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

describe("settingsSchema: the Assistant's settings", () => {
  it('unset → the defaults of .env.example, and no key or model', () => {
    const unset = { ...valid, OPENROUTER_API_KEY: undefined, ASSISTANT_MODEL: undefined };

    expect(settingsSchema.parse(unset)).toMatchObject({
      OPENROUTER_API_KEY: '',
      ASSISTANT_MODEL: '',
      ASSISTANT_DAILY_MESSAGES: 50,
      ASSISTANT_MAX_STEPS: 8,
      ASSISTANT_TIMEOUT_MS: 30_000,
      ASSISTANT_MAX_OUTPUT_TOKENS: 4000,
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

describe('settingsSchema: the global aliases', () => {
  it('missing → on, with 10 percent held back', () => {
    expect(settingsSchema.parse(valid)).toMatchObject({
      ASSISTANT_GLOBAL_ALIASES: true,
      ASSISTANT_ALIAS_HOLDBACK_PERCENT: 10,
    });
  });

  it('false and 0 → off, with nobody held back', () => {
    expect(
      settingsSchema.parse({ ...valid, ASSISTANT_GLOBAL_ALIASES: 'false', ASSISTANT_ALIAS_HOLDBACK_PERCENT: '0' }),
    ).toMatchObject({ ASSISTANT_GLOBAL_ALIASES: false, ASSISTANT_ALIAS_HOLDBACK_PERCENT: 0 });
  });

  it.each([
    ['ASSISTANT_GLOBAL_ALIASES', 'maybe'],
    ['ASSISTANT_ALIAS_HOLDBACK_PERCENT', '101'],
    ['ASSISTANT_ALIAS_HOLDBACK_PERCENT', '-1'],
    ['ASSISTANT_ALIAS_HOLDBACK_PERCENT', '2.5'],
  ])('%s=%s → refused, naming it', (setting, value) => {
    expect(refused({ ...valid, [setting]: value })).toEqual([setting]);
  });
});
