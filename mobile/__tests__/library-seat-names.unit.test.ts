/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { shortName } from '@/library/cards/seat-rooms';
import names from './fixtures/library-seat-names.json';

// The short names of 관정관's seat spaces, which the main server gives the Assistant's model too, so that its words match
// the seat card (P05 ticket 66). The fixture is a byte-for-byte copy of
// main-server/test/fixtures/library/app-seat-names.json, which the server's names are checked against: each side fails
// when its own names drift.
describe("The seat spaces' short names", () => {
  it.each(Object.entries(names))('of %s are %s, as the main server names them', (id, short) => {
    expect(shortName({ id, name: '도서관의 이름' })).toBe(short);
  });
});
