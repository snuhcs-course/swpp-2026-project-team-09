/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReplyStep } from '@/api/assistant-types';
import { caretOf } from '@/screens/main/answer/steps-bar';

// Where the time card's caret points on the bar of several requests (P01 ticket 23): the chosen step's span's middle,
// as a share of the bar's range, which runs from 30 minutes before the first step to 30 minutes after the last.

function step(kind: ReplyStep['kind'], startAt: string | null, endAt: string | null): ReplyStep {
  return {
    kind,
    title: kind === 'seat' ? '7층 7A 열람실 2 구역' : '학생회관식당에서 저녁',
    place: null,
    from: null,
    startAt,
    endAt,
    status: 'shown',
    reason: null,
    shows: { kind: 'answer' },
  };
}

// "17시 반에 관정 갔다가 19시쯤 저녁 먹을래": ① a seat 17:30–19:00, ② dinner 19:04–19:30. The bar runs 17:00–20:00,
// 180 minutes.
const STEPS = [
  step('seat', '2026-11-27T17:30:00+09:00', '2026-11-27T19:00:00+09:00'),
  step('meal', '2026-11-27T19:04:00+09:00', '2026-11-27T19:30:00+09:00'),
];

// Partitions: the first step and the last; a step with no time; an index past the steps.
describe('the time card’s caret on the bar of several requests', () => {
  it('points at the middle of the chosen step’s span', () => {
    // ① 18:15, 75 minutes in; ② 19:17, 137 minutes in.
    expect(caretOf(STEPS, 0)).toBeCloseTo((75 / 180) * 100, 6);
    expect(caretOf(STEPS, 1)).toBeCloseTo((137 / 180) * 100, 6);
  });

  it('is left out for a step with no time, which has no span', () => {
    const steps = [...STEPS, step('meet', null, null)];

    expect(caretOf(steps, 2)).toBeUndefined();
    expect(caretOf(steps, 1)).toBeCloseTo((137 / 180) * 100, 6);
  });

  it('is left out for an index past the steps', () => {
    expect(caretOf(STEPS, 2)).toBeUndefined();
  });
});
