/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { WAY_LOOKUP } from '@/api/mock/data/way-lookup';
import { isLookup } from '@/api/server/lookup-answers';

// A menu Lookup's facts (P05 ticket 12), which the map writes on the Restaurant's flag and card (P04 ticket 08). They
// are optional: a main server before them sends none.

const MENU_LOOKUP = { ...WAY_LOOKUP, kind: 'menu' };

const MENU = {
  hours: { opensAt: '11:30', closesAt: '13:30' },
  dishes: [
    { name: '부대짬뽕&군만두', price: 6500 },
    { name: '오늘의 국', price: null },
  ],
};

describe("A menu Lookup's facts", () => {
  it.each([
    ['with hours and dishes', MENU],
    ['with no hours kept', { ...MENU, hours: null }],
  ])('are believed %s', (_, menu) => {
    expect(isLookup({ ...MENU_LOOKUP, menu })).toBe(true);
  });

  it('may be absent', () => {
    expect(isLookup(MENU_LOOKUP)).toBe(true);
  });

  it.each([
    ['hours as words', { ...MENU, hours: '11:30–13:30' }],
    ['a dish without a name', { ...MENU, dishes: [{ price: 6500 }] }],
    ['a price as words', { ...MENU, dishes: [{ name: '돈까스', price: '5,500원' }] }],
  ])('refuse %s', (_, menu) => {
    expect(isLookup({ ...MENU_LOOKUP, menu })).toBe(false);
  });
});
