/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { wordsOf } from '@/screens/main/answer/band-body';

// The words over a band moved whole (P01 ticket 44): the times it is dragged to, so that a far time is seen as it is
// reached, unless it lies over someone's busy stretch, when who cannot come (P02 ticket 25). The stored meet of board
// a5: the band 12:15–12:43 "12:15–12:43 · 함께 28분", 나 busy 13:00–13:50.

const band = MEET_ANSWER.plans[0]?.band;
if (band === undefined) {
  throw new Error('The stored answer has no Plan');
}
const at = (clock: string): string => `2026-11-17T${clock}:00+09:00`;
const held = { shown: { startAt: band.startAt, endAt: band.endAt }, bound: null };

describe('The words over a band moved whole', () => {
  it('say the times it is dragged to, its length kept', () => {
    expect(wordsOf(band, { startAt: at('14:00'), endAt: at('14:28') }, held)).toEqual([
      { text: '14:00–14:28 · 함께 28분', strong: false },
    ]);
  });

  it('say who cannot come over a busy stretch', () => {
    expect(wordsOf(band, { startAt: at('13:30'), endAt: at('13:58') }, held)).toEqual([
      { text: '13:30–13:58 · 내가 안 돼요', strong: false },
    ]);
  });

  it('are its own words where it stands', () => {
    expect(wordsOf(band, held.shown, held)).toEqual([{ text: '12:15–12:43 · 함께 28분', strong: false }]);
  });
});
