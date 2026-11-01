/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Partitions: each setting missing, malformed and on either side of its bound (P09 spec, (a)). The valid settings and
// the bounds come from .env.example and README.md's "Run it"; WORKER_TOKEN is made as the main server's README says.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { settingsSchema } from '../src/common/settings.js';

type Values = Record<string, string | undefined>;

const example = parseEnv(readFileSync(fileURLToPath(new URL('../.env.example', import.meta.url)), 'utf8'));

// .env.example leaves WORKER_TOKEN to main-server/.env, where `openssl rand -hex 32` wrote 64 hex digits.
const valid: Values = { ...example, WORKER_TOKEN: '0123456789abcdef'.repeat(4) };

// The settings a refusal names, as the start-up error prints them.
function refused(values: Values): string[] {
  const result = settingsSchema.safeParse(values);
  return result.success ? [] : [...new Set(result.error.issues.map(({ path }) => String(path[0])))];
}

describe('settingsSchema', () => {
  it(".env.example's settings with a WORKER_TOKEN → accepted, PORT as a number", () => {
    expect(settingsSchema.parse(valid)).toEqual({
      PORT: 3002,
      MAIN_SERVER_URL: 'http://localhost:3000',
      WORKER_TOKEN: valid.WORKER_TOKEN,
      EXTRA_SNU_COLLECTION: false,
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

describe('settingsSchema: MAIN_SERVER_URL', () => {
  it.each([
    ['missing', undefined],
    ['a host name without a scheme', 'main-server'],
  ])('%s → refused, naming MAIN_SERVER_URL', (_as, value) => {
    expect(refused({ ...valid, MAIN_SERVER_URL: value })).toEqual(['MAIN_SERVER_URL']);
  });
});

describe('settingsSchema: WORKER_TOKEN', () => {
  it.each([
    ['missing', undefined],
    ['of 31 characters', 'a'.repeat(31)],
  ])('%s → refused, naming WORKER_TOKEN', (_as, value) => {
    expect(refused({ ...valid, WORKER_TOKEN: value })).toEqual(['WORKER_TOKEN']);
  });

  it('of 32 characters → accepted', () => {
    expect(refused({ ...valid, WORKER_TOKEN: 'a'.repeat(32) })).toEqual([]);
  });
});

describe('settingsSchema: EXTRA_SNU_COLLECTION', () => {
  it('unset → off', () => {
    expect(settingsSchema.parse({ ...valid, EXTRA_SNU_COLLECTION: undefined }).EXTRA_SNU_COLLECTION).toBe(false);
  });

  it('on → on', () => {
    expect(settingsSchema.parse({ ...valid, EXTRA_SNU_COLLECTION: 'on' }).EXTRA_SNU_COLLECTION).toBe(true);
  });

  it('anything else → refused, naming EXTRA_SNU_COLLECTION', () => {
    expect(refused({ ...valid, EXTRA_SNU_COLLECTION: 'true' })).toEqual(['EXTRA_SNU_COLLECTION']);
  });
});
