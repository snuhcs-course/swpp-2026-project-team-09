/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The fixtures the app and the main server share, each project checking its own code against its own copy (P05 ticket
// 66). This reads both copies as text, imports nothing of the main server, and fails when one was changed without the
// other. main-server/test/fixture-copies.unit.test.ts reads the same pairs, so that a change on either side runs it.

// The app's types have no Node.js: what this test uses of it, typed here.
// oxlint-disable-next-line no-underscore-dangle -- Jest gives each test file its own folder by this name
declare const __dirname: string;
const { readFileSync } = jest.requireActual<{ readFileSync: (path: string, encoding: 'utf8') => string }>('node:fs');
const { join } = jest.requireActual<{ join: (...parts: string[]) => string }>('node:path');

// oxlint-disable-next-line no-underscore-dangle -- as above
const ROOT = join(__dirname, '..', '..');

const COPIES: readonly (readonly [string, string])[] = [
  ['main-server/test/fixtures/library/app-seat-names.json', 'mobile/__tests__/fixtures/library-seat-names.json'],
];

describe('The fixtures the app and the main server share', () => {
  it.each(COPIES)('are byte for byte the same: %s and %s', (server, app) => {
    expect(readFileSync(join(ROOT, app), 'utf8')).toBe(readFileSync(join(ROOT, server), 'utf8'));
  });
});
