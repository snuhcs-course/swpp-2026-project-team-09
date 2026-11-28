/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReplyStep } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { answerStepDrawn, stepPressOf } from '@/screens/main/step-press';

// What a press on a step's flag does, which its "›" says, for every kind of step (P03 ticket 25): another step's
// chooses it; the step shown opens its card when it is the booking on screen; else nothing. The step shown as an
// answer with a Plan is drawn by that answer's own map, as alone (P03 ticket 26).

const KEY = 'book:7F-7A-zone2:2026-11-02:1730:90';

function step(kind: ReplyStep['kind'], shows: ReplyStep['shows']): ReplyStep {
  return {
    kind,
    title: '관정 7층 열람실',
    place: null,
    from: null,
    startAt: null,
    endAt: null,
    status: 'shown',
    reason: null,
    shows,
  };
}

const SEAT = step('seat', { kind: 'card', key: KEY });
const ROOM = step('room', { kind: 'card', key: 'book:room:other' });
const ANSWER_STEP = step('meal', { kind: 'answer' });
const NOT_DONE = step('seat', null);

// Partitions: a step not shown; the step shown as the booking on screen, as another card, as an answer, not done.
describe("a step's flag press", () => {
  it('chooses a step that is not the one shown, whatever its kind', () => {
    expect(stepPressOf(SEAT, 0, { active: 1, key: null })).toBe('choose');
    expect(stepPressOf(ANSWER_STEP, 1, { active: 0, key: KEY })).toBe('choose');
  });

  it('opens the card of the step shown when it is the booking on screen, and nothing for another card', () => {
    expect(stepPressOf(SEAT, 0, { active: 0, key: KEY })).toBe('card');
    expect(stepPressOf(ROOM, 0, { active: 0, key: KEY })).toBeNull();
  });

  it('does nothing for the step shown as an answer, whose own pick takes the press, or one not done', () => {
    expect(stepPressOf(ANSWER_STEP, 1, { active: 1, key: KEY })).toBeNull();
    expect(stepPressOf(NOT_DONE, 0, { active: 0, key: KEY })).toBeNull();
  });
});

const [PLAN] = MEAL_ANSWER.plans;

function shown(
  steps: readonly ReplyStep[] | null,
  activeStep: number,
  withPlan: boolean,
): Parameters<typeof answerStepDrawn>[0] {
  return {
    steps: steps === null ? null : { bubbleId: 1, steps },
    activeStep,
    answer: { plan: withPlan ? (PLAN ?? null) : null },
  };
}

// Partitions: an answer step shown with its Plan on screen, without one; a seat step shown; no steps.
describe('the step shown, drawn as its answer alone', () => {
  it('is an answer step whose Plan is on screen', () => {
    expect(answerStepDrawn(shown([SEAT, ANSWER_STEP], 1, true))).toBe(true);
  });

  it('is no step with no Plan on screen, no seat step, and nothing without steps', () => {
    expect(answerStepDrawn(shown([SEAT, ANSWER_STEP], 1, false))).toBe(false);
    expect(answerStepDrawn(shown([SEAT, ANSWER_STEP], 0, true))).toBe(false);
    expect(answerStepDrawn(shown(null, 0, true))).toBe(false);
  });
});
