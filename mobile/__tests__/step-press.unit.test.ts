/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReplyStep } from '@/api/assistant-types';
import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { STUDY_PLAN_ANSWER } from '@/api/mock/data/study-plan-answer';
import { STEP_ID } from '@/features/assistant/steps-scene';
import { isAnswerStepFlag, stepPressOf } from '@/screens/main/step-press';

// What a press on a step's flag does, which its "›" says, for every kind of step (P03 ticket 25): another step's
// chooses it; the step shown opens its card when it is the booking on screen, or what its answer's chosen place opens
// alone (a menu, a study place's spaces, else the pick's card); else nothing.

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

// Partitions: a step not shown; the step shown as the booking on screen, as another card, as an answer of each kind.
describe("a step's flag press", () => {
  it('chooses a step that is not the one shown, whatever its kind', () => {
    expect(stepPressOf(SEAT, 0, { active: 1, key: null, answer: null })).toBe('choose');
    expect(stepPressOf(ANSWER_STEP, 1, { active: 0, key: KEY, answer: null })).toBe('choose');
  });

  it('opens the card of the step shown when it is the booking on screen, and nothing for another card', () => {
    expect(stepPressOf(SEAT, 0, { active: 0, key: KEY, answer: null })).toBe('card');
    expect(stepPressOf(ROOM, 0, { active: 0, key: KEY, answer: null })).toBeNull();
  });

  it('opens the menu or the spaces of the answer shown, as its chosen place does alone', () => {
    expect(stepPressOf(ANSWER_STEP, 1, { active: 1, key: KEY, answer: MEAL_ANSWER_MENUS })).toBe('menu');
    expect(stepPressOf(ANSWER_STEP, 1, { active: 1, key: KEY, answer: STUDY_PLAN_ANSWER })).toBe('menu');
  });

  it("opens the pick's card of any other answer shown, as its pick does alone: a meal whose menus are not known, events", () => {
    expect(stepPressOf(ANSWER_STEP, 1, { active: 1, key: KEY, answer: MEAL_ANSWER })).toBe('pick');
    expect(stepPressOf(ANSWER_STEP, 1, { active: 1, key: KEY, answer: EVENTS_ANSWER })).toBe('pick');
  });

  it('does nothing for the step shown with nothing on screen: a step not done', () => {
    expect(stepPressOf(NOT_DONE, 0, { active: 0, key: KEY, answer: MEAL_ANSWER })).toBeNull();
  });
});

// Partitions: an answer step's flag; a card step's flag; a mark that is no step's.
describe("the card a step's flag opens", () => {
  const shown = { bubbleId: 1, steps: [SEAT, ANSWER_STEP] };

  it("is the answer's pick card for a step shown as an answer, and the scene's own for any other mark", () => {
    expect(isAnswerStepFlag(shown, `${STEP_ID}2`)).toBe(true);
    expect(isAnswerStepFlag(shown, `${STEP_ID}1`)).toBe(false);
    expect(isAnswerStepFlag(shown, 'answer:pick')).toBe(false);
    expect(isAnswerStepFlag(null, `${STEP_ID}2`)).toBe(false);
  });
});
