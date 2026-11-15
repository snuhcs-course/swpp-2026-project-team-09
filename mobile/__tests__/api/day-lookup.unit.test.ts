/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { DAY_LOOKUP } from '@/api/mock/data/day-lookup';
import { isLookup } from '@/api/server/lookup-answers';

const [FIRST] = DAY_LOOKUP.scene.places;

// The app's check of a day's Lookup, on the stored copy of the main server's Lookup for "오늘 수업 뭐 있어?" (board
// q14), written by its `dayAnswer` over the seed's Places and walking table. Expected values: the copy passes as the
// server wrote it, and copies of it with one part changed do not.
describe('the check of a Lookup of a day', () => {
  it('passes the stored copy of a real one, with its Classes as steps and its buildings numbered', () => {
    expect(isLookup(DAY_LOOKUP)).toBe(true);
  });

  it.each([
    ['with a step without its text', { ...DAY_LOOKUP, steps: [{ at: '11:00–11:50' }] }],
    ['with a step whose time is a number', { ...DAY_LOOKUP, steps: [{ at: 1100, text: '301동' }] }],
    ['with steps that are not a list', { ...DAY_LOOKUP, steps: '301동' }],
    [
      'with a building numbered in words',
      { ...DAY_LOOKUP, scene: { ...DAY_LOOKUP.scene, places: [{ ...FIRST, order: '1' }] } },
    ],
  ])('refuses one %s', (_, lookup) => {
    expect(isLookup(lookup)).toBe(false);
  });
});
