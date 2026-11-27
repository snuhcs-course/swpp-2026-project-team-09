/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readFileSync } from 'node:fs';

// The fixtures the main server and the app share, each project checking its own code against its own copy (P05 ticket
// 66). This reads both copies as bytes, imports nothing of the app, and fails when one was changed without the other.
// The app's mobile/__tests__/fixture-copies.unit.test.ts reads the same pairs, so that a change on either side runs it.
const COPIES: readonly (readonly [string, string])[] = [
  ['main-server/test/fixtures/library/app-seat-names.json', 'mobile/__tests__/fixtures/library-seat-names.json'],
];

const bytesOf = (path: string): Buffer => readFileSync(new URL(`../../${path}`, import.meta.url));

describe('The fixtures the main server and the app share', () => {
  it.each(COPIES)('are byte for byte the same: %s and %s', (server, app) => {
    expect(bytesOf(app).equals(bytesOf(server))).toBe(true);
  });
});
