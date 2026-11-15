/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { KIM_MINSU, LEE_MINSU, WHICH_MINSU, whichFriend } from '../support/which-friend';
import { REFUSAL_REPLIES } from '@/api/mock/data/refusals';
import { REFUSAL_KINDS } from '@/api/refusal-types';
import { isRefusal } from '@/api/server/refusal-answers';

// The app's check of a reply's refusal, on the stored copies of the main server's replies to row 8's boards (P02
// ticket 10). Expected values: every copy passes, and copies with one part broken fail.

const [, FIRST] = [...REFUSAL_REPLIES.entries()][0] ?? [];

function first(): NonNullable<typeof FIRST> {
  if (FIRST === undefined) {
    throw new Error('No stored refusal');
  }
  return FIRST;
}

describe('the check of a refusal', () => {
  it('keeps a copy of each kind', () => {
    expect(new Set([...REFUSAL_REPLIES.values()].map(({ refusal }) => refusal.kind))).toEqual(new Set(REFUSAL_KINDS));
  });

  it.each([...REFUSAL_REPLIES.entries()])('passes the copy for "%s"', (_, reply) => {
    expect(isRefusal(reply.refusal)).toBe(true);
  });

  it("passes an offer that opens the map's explanation of the location", () => {
    const refusal = { ...first().refusal, offers: [{ kind: 'open', label: '위치 켜기', screen: 'location' }] };

    expect(isRefusal(refusal)).toBe(true);
  });

  it.each([
    ['of an unknown kind', { kind: 'other' }],
    ['without its lines', { lines: undefined }],
    ['with a line of another shape', { lines: [['캠퍼스 안의 일만 도와 드려요.']] }],
    ['with an offer of an unknown kind', { offers: [{ kind: 'meet', label: '만나고 싶다', userId: 'u' }] }],
    ['with an ask without its words', { offers: [{ kind: 'ask', label: '배고파' }] }],
    ['with an open of an unknown screen', { offers: [{ kind: 'open', label: '설정', screen: 'settings' }] }],
  ])('refuses a refusal %s', (_, broken) => {
    expect(isRefusal({ ...first().refusal, ...broken })).toBe(false);
  });
});

// P02 ticket 17: the question of which Friend, before package A sends it. Partitions: an aside written and none;
// each field of an offer missing, and an aside of another type.
describe('the check of the question of which Friend', () => {
  it('passes the question with a Friend to pick for each candidate', () => {
    expect(isRefusal(WHICH_MINSU)).toBe(true);
  });

  it('passes a candidate with no aside', () => {
    expect(isRefusal(whichFriend('민수', [KIM_MINSU, { ...LEE_MINSU, aside: null }]))).toBe(true);
  });

  it.each(['userId', 'label', 'aside', 'text'] as const)('refuses an offer without its %s', (name) => {
    const { [name]: _missing, ...broken } = KIM_MINSU;

    expect(isRefusal({ ...WHICH_MINSU, offers: [broken, LEE_MINSU] })).toBe(false);
  });

  it('refuses an aside that is not words', () => {
    expect(isRefusal({ ...WHICH_MINSU, offers: [{ ...KIM_MINSU, aside: 3 }, LEE_MINSU] })).toBe(false);
  });
});
