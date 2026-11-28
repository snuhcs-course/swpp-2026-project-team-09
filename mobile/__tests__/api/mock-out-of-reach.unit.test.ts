/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { RequestContext } from '@/api/assistant-types';
import { outOfReachReplyTo } from '@/api/mock/data/out-of-reach';
import { severalAnswersReplyTo } from '@/api/mock/data/several-answers';

// The mock's stand-in for the main server's reply to a meal asked for a day out of reach (P05 ticket 79), so that the
// emulator shows what the app does with it (P03 ticket 22). Partitions: one of two steps; one answer open; another
// meal than the one on screen; words of no such ask.

const lunchDinner = severalAnswersReplyTo('점심이랑 저녁 짜줘', '2026-11-29');
const [lunch, dinner] = lunchDinner?.answers ?? [];
if (lunch === undefined || dinner === undefined) {
  throw new Error('No stored reply of lunch and dinner');
}

const NOTHING: RequestContext = {
  location: null,
  locationMissing: null,
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};

const steps: RequestContext = {
  ...NOTHING,
  conditions: dinner.input,
  answers: [lunch.input, dinner.input],
  steps: lunchDinner?.steps ?? [],
};

describe("The mock's reply to a meal asked for a day out of reach", () => {
  it("names dinner's step among two and lets lunch stay, so it does not clear", () => {
    expect(outOfReachReplyTo('저녁은 다다음주 월요일로', steps)).toMatchObject({
      answer: null,
      answers: [],
      withdrawn: [dinner.key],
    });
    expect(outOfReachReplyTo('저녁은 다다음주 월요일로', steps)).not.toHaveProperty('clears');
  });

  it('names the one answer open and clears, when it is the same meal', () => {
    const one = { ...NOTHING, conditions: lunch.input };

    expect(outOfReachReplyTo('다다음주 월요일 점심', one)).toMatchObject({ withdrawn: [lunch.key], clears: true });
  });

  it('names nothing and keeps the answer open, for another meal', () => {
    const reply = outOfReachReplyTo('다다음주 월요일 저녁', { ...NOTHING, conditions: lunch.input });

    expect(reply).not.toHaveProperty('withdrawn');
    expect(reply).not.toHaveProperty('clears');
  });

  it('is none for words that ask no meal out of reach', () => {
    expect(outOfReachReplyTo('저녁은 7시로', steps)).toBeNull();
  });
});
