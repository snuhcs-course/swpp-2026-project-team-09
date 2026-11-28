/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { loadCases } from '../eval/cases.ts';
import { type Expect } from '../eval/expect.ts';
import { scoreTurn } from '../eval/score.ts';
import { call, names, turn } from './eval-traces.ts';

// The past-times cases that ask back (P05 ticket 80), scored on the reply a correct run gives: the server's question
// alone, with nothing shown, which the scorer reads as an ASK by the words the text must hold. TaeHyun79's review of
// #743: written as TOOL, they would fail their action check whatever the model did.

function expectationOf(id: string): Expect {
  const found = loadCases().find((each) => each.id === id)?.expect;
  if (found === undefined) {
    throw new Error(`No case ${id} with an expectation`);
  }
  return found;
}

const asked = { result: 'asked', reason: 'The app asks the User back.' };

describe('A past-times case that asks back', () => {
  it.each([
    [
      'past-times-library-then-lunch',
      call('askPastTime', { named: '아침 7시', at: '07:00' }, asked),
      '오늘 아침 7시는 지났어요. 내일로 볼까요?',
    ],
    [
      'past-times-lunch-after-lunch',
      call('planMeal', { date: '2026-11-02', meal: 'lunch' }, { ...asked, meal: 'lunch' }),
      '오늘 점심 시간은 지났어요. 오늘 저녁이나 내일 점심으로 볼까요?',
    ],
  ])('%s passes on the server’s question with nothing shown', (id, asking, text) => {
    const score = scoreTurn(turn({ steps: [[asking]], text }), expectationOf(id), names);

    expect(score).toMatchObject({ action: 'ASK', passed: true });
  });
});
