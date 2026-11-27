/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, PlanInput } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { bandFor, frameOf, frameOfPlan } from '@/features/assistant/answer-frame';

// The frame an answer with no Plan keeps (P01 ticket 31): the band the main server sends with it, else the last Plan's
// band redrawn for the conditions asked now. Partitions: a band sent, none sent with a Plan before, none at all; the
// window's bounds set or open; people added and taken out; a meal and a meet. Expected values: the ticket's rule.

const [MEAL_PLAN] = MEAL_ANSWER.plans;
const [MEET_PLAN] = MEET_ANSWER.plans;
if (MEAL_PLAN === undefined || MEET_PLAN === undefined) {
  throw new Error('The stored answers have no Plan');
}
const [ASKER, MIN_SU] = MEAL_ANSWER.input.people;

function noPlanTo(answer: AnswerReply, input: PlanInput, band?: AnswerReply['plans'][number]['band']): AnswerReply {
  const noPlan = { reason: 'no-shared-time' as const, lines: [], ...(band === undefined ? {} : { band }) };
  return { ...answer, input, plans: [], noPlan };
}

describe('frameOf', () => {
  it('is none for an answer with a Plan, which is its own frame', () => {
    expect(frameOf(MEAL_ANSWER, frameOfPlan(MEAL_PLAN))).toBeNull();
  });

  it('takes the band the main server sends with an answer with no Plan', () => {
    const band = { ...MEAL_PLAN.band, text: '12:00–13:00' };

    expect(frameOf(noPlanTo(MEAL_ANSWER, MEAL_ANSWER.input, band), null)?.band).toBe(band);
  });

  it('is none with no band sent and no Plan before', () => {
    expect(frameOf(noPlanTo(MEAL_ANSWER, MEAL_ANSWER.input), null)).toBeNull();
  });

  it("redraws the last Plan's band for the conditions asked", () => {
    const alone = { ...MEAL_ANSWER.input, people: MEAL_ANSWER.input.people.slice(0, 1) };

    const frame = frameOf(noPlanTo(MEAL_ANSWER, alone), frameOfPlan(MEAL_PLAN));

    expect(frame?.band.lanes.map(({ userId }) => userId)).toEqual([ASKER?.userId]);
    expect(frame?.band.others?.map(({ userId }) => userId)).toContain(MIN_SU?.userId);
  });
});

describe('bandFor', () => {
  it('says the window asked for when both its bounds are set', () => {
    const band = bandFor(MEAL_PLAN.band, { ...MEAL_ANSWER.input, window: { from: '12:30', until: '13:20' } });

    expect(band.text).toBe('12:30–13:20');
    expect(band.startAt).toBe(`${MEAL_PLAN.band.startAt.slice(0, 11)}12:30:00${MEAL_PLAN.band.startAt.slice(19)}`);
  });

  it("keeps the band's length from a start set alone, as a band moved whole", () => {
    const length = new Date(MEAL_PLAN.band.endAt).getTime() - new Date(MEAL_PLAN.band.startAt).getTime();

    const band = bandFor(MEAL_PLAN.band, { ...MEAL_ANSWER.input, window: { from: '12:30', until: null } });

    expect(new Date(band.endAt).getTime() - new Date(band.startAt).getTime()).toBe(length);
  });

  it("keeps the band's own times with an open window", () => {
    const band = bandFor(MEET_PLAN.band, MEET_ANSWER.input);

    expect([band.startAt, band.endAt]).toEqual([MEET_PLAN.band.startAt, MEET_PLAN.band.endAt]);
  });
});
