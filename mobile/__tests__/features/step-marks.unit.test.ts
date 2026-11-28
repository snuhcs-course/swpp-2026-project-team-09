/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, ReplyStep } from '@/api/assistant-types';
import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { NEW_QUEST_ANSWER } from '@/api/mock/data/new-quest-answer';
import { QUESTS_ANSWER } from '@/api/mock/data/quests-answer';
import { stepsReplyOn } from '@/api/mock/data/steps-answer';
import { STUDY_PLAN_ANSWER } from '@/api/mock/data/study-plan-answer';
import { drawingOf } from '@/features/assistant/answer-marks';
import { answerTone } from '@/features/assistant/answer-tone';
import { stepDrafts, stepMarkRole } from '@/features/assistant/steps-scene';
import { seen } from '../support/answer-marks';

// A step of several requests is drawn in the colour its answer is drawn in alone (P03 ticket 24, the user's rule of
// 2026-11-28, one colour for one thing): the map's marks of the steps and of the answer read the same table
// (`kindTone`), never a second one. Each step's round holds its kind's icon from that table, never a number, which
// means an answer's candidates alone (P03 ticket 26, "가안이 좋아보여"); a room's step is study; every step done is
// solid.

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

// Partitions: a seat's, a meal's, and each other kind's round; a step not done; the flag's words. Expected values: the
// kinds' icons in `kindTone`.
describe("The steps' marks, by kind", () => {
  it("hold their kind's icon and no number: the book for a seat, the fork and spoon for a meal", () => {
    const [seat, meal] = stepsReplyOn('2026-11-02').steps ?? [];
    if (seat === undefined || meal === undefined) {
      throw new Error('No seat or meal step');
    }

    expect(markOf(seat).symbol).toMatchObject({ number: null, icon: 'bookOpen' });
    expect(markOf(meal).symbol).toMatchObject({ number: null, icon: 'meal' });
    expect(markOf(seat).number).toBeNull();
  });

  it.each<[string, AnswerReply, string]>([
    ['an events answer', EVENTS_ANSWER, 'calendar'],
    ['a Quests answer', QUESTS_ANSWER, 'users'],
    ['a new Quest', NEW_QUEST_ANSWER, 'users'],
    ['a meet', MEET_ANSWER, 'user'],
    ['a study', STUDY_PLAN_ANSWER, 'bookOpen'],
  ])("hold %s's icon by the same table", (_, answer, icon) => {
    expect(markOf(stepOf(answer)).symbol).toMatchObject({ number: null, icon });
  });

  it('hold no icon and no number for a step not done, grey', () => {
    const { symbol } = markOf({ ...stepOf(MEAL_ANSWER_MENUS), status: 'not-done' });

    expect(symbol).toMatchObject({ role: 'dropped', number: null });
    expect(symbol).not.toHaveProperty('icon');
  });

  it("take the study colour for a room's step, as a seat's, and are solid for every step done", () => {
    expect(answerTone('room')).toBe('study');
    expect(stepMarkRole({ status: 'shown' })).toBe('pick');
    expect(stepMarkRole({ status: 'not-done' })).toBe('dropped');
  });
});

// Partitions: a step's mark beside an answer drawn as alone, a meal without menus and events (their pick opens a card,
// "›"), and a meal with menus (its pick is the meal's). Expected values: the emulator, 2026-11-28: the seat's flag beside dinner read
// "관정 7층 열람실 › ›", the answer's own "›" added again to a mark that carries its own.
describe("A step's mark beside an answer drawn as alone", () => {
  it.each<[string, AnswerReply]>([
    ['a meal whose menus are not known', MEAL_ANSWER],
    ['a meal with menus', MEAL_ANSWER_MENUS],
    ['an events answer', EVENTS_ANSWER],
  ])('keeps its own words and look beside %s', (_, answer) => {
    const [seat] = stepsReplyOn('2026-11-02').steps ?? [];
    if (seat === undefined) {
      throw new Error('No seat step');
    }
    const beside = stepDrafts([seat], ['17:30–19:00'], ['관정 7층 열람실']);
    const { label, symbol } = seen(drawingOf(answer, 0, undefined, null, undefined, beside), 'answer:step:1');

    expect(label?.title).toBe('관정 7층 열람실 ›');
    expect(symbol).toMatchObject({ icon: 'bookOpen', number: null });
  });
});

// Partitions: a flag's name; the step shown, drawn as alone, and the others.
describe("The steps' flags", () => {
  it('are named by their title and line, with no number before it', () => {
    const [seat] = stepsReplyOn('2026-11-02').steps ?? [];
    if (seat === undefined) {
      throw new Error('No seat step');
    }
    const [draft] = stepDrafts([seat], ['17:30–19:00'], ['관정 7층 열람실']);

    expect(draft?.name).toBe('관정 7층 열람실 › · 17:30–19:00');
  });

  it('leave out the step drawn as its answer or booking alone', () => {
    const steps = stepsReplyOn('2026-11-02').steps ?? [];

    expect(stepDrafts(steps, ['', ''], ['', ''], [], 1).map(({ id }) => id)).toEqual(['answer:step:1']);
    expect(stepDrafts(steps, ['', ''], ['', ''], [], 0).map(({ id }) => id)).toEqual(['answer:step:2']);
  });
});
