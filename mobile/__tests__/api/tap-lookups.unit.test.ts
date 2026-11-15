/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { FRIEND_TAPS, TAP_LOOKUPS } from '@/api/mock/data/tap-lookups';
import { WAY_LOOKUP } from '@/api/mock/data/way-lookup';
import { isLookup } from '@/api/server/lookup-answers';

// The app's check of a pressed building's or Friend's Lookup, on the stored copies of the main server's cards: the
// buildings of wireframe row 6 (boards a1, a2, a3, and a14) and the mock's Friends, written by its `placeAnswer` and
// `friendTap` over the seed's Places and walking table. Expected values: each passes as the server wrote it, and copies
// with one part changed.

const { a1: STUDENT_CENTER } = TAP_LOOKUPS;

const CARD = {
  title: '63동',
  subtitle: '학생회관',
  facts: [{ icon: 'route', text: '걸어서 15분 · 12:25 도착', strong: true, userId: null }],
  note: null,
};

const ASK = { kind: 'ask', label: '관정 보기', text: '관정 지금 자리 있어?' };

describe('the check of a pressed Place or Friend', () => {
  it.each(Object.entries(TAP_LOOKUPS))('passes the stored copy of board %s', (_, lookup) => {
    expect(isLookup(lookup)).toBe(true);
  });

  it.each(Object.entries(FRIEND_TAPS))("passes the stored copy of the mock's Friend %s", (_, lookup) => {
    expect(isLookup(lookup)).toBe(true);
  });

  it.each([
    ['without a card, as an asked Lookup is', WAY_LOOKUP],
    ['with no card', { ...WAY_LOOKUP, card: null }],
    ['with a card without a subtitle or a note', { ...WAY_LOOKUP, card: CARD }],
    ['with an ask', { ...STUDENT_CENTER, actions: [ASK] }],
  ])('passes a Lookup %s', (_, lookup) => {
    expect(isLookup(lookup)).toBe(true);
  });

  it.each([
    ['with a card of another shape', { ...STUDENT_CENTER, card: { title: '63동' } }],
    [
      'with a fact of an unknown icon',
      { ...STUDENT_CENTER, card: { ...CARD, facts: [{ ...CARD.facts[0], icon: 'star' }] } },
    ],
    [
      'with a fact without its Friend',
      { ...STUDENT_CENTER, card: { ...CARD, facts: [{ icon: 'user', text: '김민수가 여기 있어요', strong: false }] } },
    ],
    [
      'with a plan whose input is of no kind',
      { ...STUDENT_CENTER, actions: [{ kind: 'plan', label: '여기서 먹기', input: { kind: 'lunch' } }] },
    ],
    ['with a plan without its label', { ...STUDENT_CENTER, actions: [{ kind: 'plan', input: null }] }],
    ['with an ask without its words', { ...STUDENT_CENTER, actions: [{ kind: 'ask', label: '관정 보기' }] }],
  ])('refuses a Lookup %s', (_, lookup) => {
    expect(isLookup(lookup)).toBe(false);
  });
});
