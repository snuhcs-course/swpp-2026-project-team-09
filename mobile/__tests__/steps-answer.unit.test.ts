/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { isStepsAsk, stepsReplyOn } from '@/api/mock/data/steps-answer';

// The mock build's reply to a seat and then dinner (P03): the stored reply passes the app's checks, moved to the day
// asked.

describe("the mock build's reply of two steps", () => {
  it('holds the seat card, the dinner, and both steps, on the day asked', () => {
    const reply = stepsReplyOn('2026-11-23');

    expect(reply.steps?.map(({ kind, status, from }) => [kind, status, from?.label ?? null])).toEqual([
      ['seat', 'shown', null],
      ['meal', 'shown', '62-1동'],
    ]);
    expect(reply.cards.map((card) => (card.kind === 'library' ? card.library.key : null))).toEqual([
      'book:7F-7A-zone2:2026-11-23:1730:90',
    ]);
    expect(reply.answer?.input).toMatchObject({ kind: 'meal', date: '2026-11-23' });
  });

  it('answers words that ask for a step and then a meal', () => {
    expect(isStepsAsk('17시 반에 관정 갔다가 19시쯤 저녁 먹으려고 해')).toBe(true);
    expect(isStepsAsk('관정 7층 자리 잡아 줘')).toBe(false);
  });
});
