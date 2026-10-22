/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: each setting missing, malformed and on either side of its bound (P09 spec, (a)). The valid settings and
// the bounds come from .env.example and README.md's "Run it"; MATCH_SERVER_TOKEN is made as main-server's README says.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { settingsSchema } from '../src/common/settings.js';

type Values = Record<string, string | undefined>;

const example = parseEnv(readFileSync(fileURLToPath(new URL('../.env.example', import.meta.url)), 'utf8'));

// .env.example leaves MATCH_SERVER_TOKEN to main-server/.env, where `openssl rand -hex 32` wrote 64 hex digits.
const valid: Values = { ...example, MATCH_SERVER_TOKEN: '0123456789abcdef'.repeat(4) };

// The settings a refusal names, as the start-up error prints them.
function refused(values: Values): string[] {
  const result = settingsSchema.safeParse(values);
  return result.success ? [] : [...new Set(result.error.issues.map(({ path }) => String(path[0])))];
}

describe('settingsSchema', () => {
  it(".env.example's settings with a MATCH_SERVER_TOKEN → accepted, the numbers as numbers", () => {
    expect(settingsSchema.parse(valid)).toEqual({
      PORT: 3003,
      DATABASE_URL: 'postgresql://match:match@localhost:5432/match',
      MATCH_SERVER_TOKEN: valid.MATCH_SERVER_TOKEN,
      MAIN_SERVER_URL: 'http://localhost:3000',
      ROUND_INTERVAL_SECONDS: 60,
    });
  });
});

describe('settingsSchema: PORT', () => {
  it.each([
    ['missing', undefined],
    ['abc', 'abc'],
    ['0', '0'],
    ['65536', '65536'],
  ])('%s → refused, naming PORT', (_as, value) => {
    expect(refused({ ...valid, PORT: value })).toEqual(['PORT']);
  });

  it.each([
    ['1', 1],
    ['65535', 65535],
  ])('%s → accepted as %i', (value, port) => {
    expect(settingsSchema.parse({ ...valid, PORT: value }).PORT).toBe(port);
  });
});

describe('settingsSchema: DATABASE_URL', () => {
  it('missing → refused, naming DATABASE_URL', () => {
    expect(refused({ ...valid, DATABASE_URL: undefined })).toEqual(['DATABASE_URL']);
  });
});

describe('settingsSchema: MATCH_SERVER_TOKEN', () => {
  it.each([
    ['missing', undefined],
    ['of 31 characters', 'a'.repeat(31)],
  ])('%s → refused, naming MATCH_SERVER_TOKEN', (_as, value) => {
    expect(refused({ ...valid, MATCH_SERVER_TOKEN: value })).toEqual(['MATCH_SERVER_TOKEN']);
  });

  it('of 32 characters → accepted', () => {
    expect(refused({ ...valid, MATCH_SERVER_TOKEN: 'a'.repeat(32) })).toEqual([]);
  });
});

describe('settingsSchema: MAIN_SERVER_URL', () => {
  it.each([
    ['missing', undefined],
    ['a host name without a scheme', 'main-server'],
  ])('%s → refused, naming MAIN_SERVER_URL', (_as, value) => {
    expect(refused({ ...valid, MAIN_SERVER_URL: value })).toEqual(['MAIN_SERVER_URL']);
  });
});

describe('settingsSchema: ROUND_INTERVAL_SECONDS', () => {
  it.each([
    ['missing', undefined],
    ['0', '0'],
    ['1.5', '1.5'],
  ])('%s → refused, naming ROUND_INTERVAL_SECONDS', (_as, value) => {
    expect(refused({ ...valid, ROUND_INTERVAL_SECONDS: value })).toEqual(['ROUND_INTERVAL_SECONDS']);
  });

  it('1 → accepted as 1', () => {
    expect(settingsSchema.parse({ ...valid, ROUND_INTERVAL_SECONDS: '1' }).ROUND_INTERVAL_SECONDS).toBe(1);
  });
});
