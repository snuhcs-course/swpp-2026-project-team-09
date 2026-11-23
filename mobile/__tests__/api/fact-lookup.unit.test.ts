/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { WAY_LOOKUP } from '@/api/mock/data/way-lookup';
import { isLookup } from '@/api/server/lookup-answers';

// A Lookup that only tells a fact (P05 ticket 47, P04 ticket 55): `fact` is true or absent, as from a main server
// before it.

const MENU_LOOKUP = { ...WAY_LOOKUP, kind: 'menu' };

describe("A Lookup's fact mark", () => {
  it.each([
    ['true', { ...MENU_LOOKUP, fact: true }],
    ['absent', MENU_LOOKUP],
  ])('is believed %s', (_, lookup) => {
    expect(isLookup(lookup)).toBe(true);
  });

  it.each([
    ['false', false],
    ['as words', 'true'],
    ['null', null],
  ])('is refused %s', (_, fact) => {
    expect(isLookup({ ...MENU_LOOKUP, fact })).toBe(false);
  });
});
