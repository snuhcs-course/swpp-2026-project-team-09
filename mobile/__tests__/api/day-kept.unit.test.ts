/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { DAY_LOOKUP } from '@/api/mock/data/day-lookup';
import { isLookup } from '@/api/server/lookup-answers';

// A day's Lookup with the User's Quests the question asked about (P05 ticket 17): "민수랑 약속 몇 시였지?" draws that
// Quest. Optional: a main server before it sends none.

const MEETING = {
  kind: 'meet',
  questId: '1a2b3c4d-0000-4000-8000-000000000001',
  title: 'SK경영관 앞에서 만나기',
  startAt: '2026-11-17T14:00:00+09:00',
  endAt: '2026-11-17T15:00:00+09:00',
  place: '58동',
  people: [{ name: '김민수', answer: 'waiting' }],
  mine: true,
  changeable: false,
};

const withKept = (kept: unknown): unknown => ({ ...DAY_LOOKUP, kept });

describe("A day's Lookup with the Quests asked about", () => {
  it.each([
    ['a meeting with a Friend waiting', [MEETING]],
    [
      'a meal of the User alone, with no end or place',
      [{ ...MEETING, kind: 'meal-lunch', endAt: null, place: null, people: [] }],
    ],
    ['none', []],
  ])('is believed with %s', (_, kept) => {
    expect(isLookup(withKept(kept))).toBe(true);
  });

  it('may be without them', () => {
    expect(isLookup(DAY_LOOKUP)).toBe(true);
  });

  it.each([
    ['a kind of no Quest', [{ ...MEETING, kind: 'class' }]],
    ['an answer of no person', [{ ...MEETING, people: [{ name: '김민수', answer: 'maybe' }] }]],
    ['changeable as words', [{ ...MEETING, changeable: 'no' }]],
  ])('is refused with %s', (_, kept) => {
    expect(isLookup(withKept(kept))).toBe(false);
  });
});
