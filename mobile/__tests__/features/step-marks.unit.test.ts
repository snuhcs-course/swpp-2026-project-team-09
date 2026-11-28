/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, ReplyStep } from '@/api/assistant-types';
import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { NEW_QUEST_ANSWER } from '@/api/mock/data/new-quest-answer';
import { QUESTS_ANSWER } from '@/api/mock/data/quests-answer';
import { stepsReplyOn } from '@/api/mock/data/steps-answer';
import { STUDY_PLAN_ANSWER } from '@/api/mock/data/study-plan-answer';
import { drawingOf } from '@/features/assistant/answer-marks';
import { answerTone } from '@/features/assistant/answer-tone';
import { bookingStepHolds, stepDrafts, stepMarkRole } from '@/features/assistant/steps-scene';
import { seen } from '../support/answer-marks';

// A step of several requests is drawn in the colour its answer is drawn in alone (P03 ticket 24, the user's rule of
// 2026-11-28, one colour for one thing): the map's marks of the steps and of the answer read the same table
// (`kindTone`), never a second one. The user's three choices for the steps' marks, awaiting his decision from use,
// each one function: a seat's step holds its number, a room's step is study, every step done is solid.

// The answer's first Plan, as a step of several requests shows it.
function stepOf(answer: AnswerReply): ReplyStep {
  const [plan] = answer.plans;
  if (plan === undefined) {
    throw new Error('An answer with no Plan');
  }
  return {
    kind: answer.input.kind,
    title: plan.place.label,
    place: plan.place,
    from: null,
    startAt: plan.startAt,
    endAt: plan.endAt,
    status: 'shown',
    reason: null,
    shows: { kind: 'answer' },
  };
}

// The tone the answer's own pick takes on the map alone: the pick of its first Plan that draws its own round.
function pickToneOf(answer: AnswerReply): string | undefined {
  const picks = answer.plans.map((_, index) => seen(drawingOf(answer, index), 'answer:pick').symbol);
  const pick = picks.find((symbol) => symbol !== null);
  return pick?.type === 'dot' ? pick.kind : undefined;
}

function markOf(step: ReplyStep): ReturnType<typeof stepDrafts>[number] {
  const [draft] = stepDrafts([step], [''], ['']);
  if (draft === undefined) {
    throw new Error('A step with a place draws no mark');
  }
  return draft;
}

const toneOf = (step: ReplyStep): string | undefined => {
  const { symbol } = markOf(step);
  return symbol?.type === 'dot' ? symbol.kind : undefined;
};

// Partitions: every kind of answer a step shows; a seat's step; a step not done. Expected values: the answer's own
// pick, drawn alone.
describe("A step's mark on the map", () => {
  it.each<[string, AnswerReply]>([
    ['a meal', MEAL_ANSWER_MENUS],
    ['a study', STUDY_PLAN_ANSWER],
    ['an events answer', EVENTS_ANSWER],
    ['a Quests answer', QUESTS_ANSWER],
    ['a new Quest', NEW_QUEST_ANSWER],
    ['a meet', MEET_ANSWER],
  ])('of %s takes the colour of the same answer alone', (_, answer) => {
    const step = stepOf(answer);

    expect(toneOf(step)).toBe(answerTone(step.kind));
    expect(toneOf(step)).toBe(pickToneOf(answer) ?? answerTone(step.kind));
  });

  it('of a seat takes the study colour, as its booking alone', () => {
    const [seat] = stepsReplyOn('2026-11-02').steps ?? [];
    if (seat === undefined) {
      throw new Error('No seat step');
    }

    expect(seat.kind).toBe('seat');
    expect(toneOf(seat)).toBe('study');
  });

  it("of a step not done is grey by its role, in no kind's colour", () => {
    const { symbol } = markOf({ ...stepOf(MEAL_ANSWER_MENUS), status: 'not-done' });

    expect(symbol).toMatchObject({ role: 'dropped' });
    expect(symbol).not.toHaveProperty('kind');
  });
});

// The user's three choices, awaiting his decision. Partitions: a seat's round; a room's colour; a step done, chosen or
// not, and one not done.
describe("The steps' marks, by the user's choices", () => {
  it("1: a seat's or a room's round holds its number, not the booking pick's book", () => {
    const [seat] = stepsReplyOn('2026-11-02').steps ?? [];
    if (seat === undefined) {
      throw new Error('No seat step');
    }

    expect(bookingStepHolds()).toBe('number');
    expect(markOf(seat).symbol).toMatchObject({ number: 1 });
    expect(markOf(seat).symbol).not.toHaveProperty('study');
  });

  it("2: a room's step takes the study colour, as a seat's", () => {
    expect(answerTone('room')).toBe('study');
  });

  it('3: every step done is solid, as a pick; one not done grey', () => {
    expect(stepMarkRole({ status: 'shown' })).toBe('pick');
    expect(stepMarkRole({ status: 'not-done' })).toBe('dropped');
  });
});
