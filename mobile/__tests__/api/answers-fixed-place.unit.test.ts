/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanPart } from '@/api/plan-part-types';
import { MEAL_ANSWER_FIXED_PLACE, MEAL_ANSWER_UNFIT_PLACE } from '@/api/mock/data/meal-answers';
import { isAnswerReply } from '@/api/server/plan-answers';

// Partitions of the check of "여기면 어때?": the stored copies of the main server's answers to boards a7 and a8, a part
// with an arrival, with none (null), and without the field (an older server); a dropped Place with parts and without;
// and an arrival or parts of the wrong kind. Expected values: boards a7 and a8, main-server `assistant/dto/answer.dto.ts`.

const time = (clock: string): string => `2026-11-17T${clock}:00+09:00`;

const [plan] = MEAL_ANSWER_FIXED_PLACE.plans;
const [dropped] = MEAL_ANSWER_UNFIT_PLACE.dropped;

function withFirstPart(change: (part: PlanPart) => object): object {
  if (plan === undefined) {
    throw new Error('The copy has no plan');
  }
  const [first, ...rest] = plan.parts;
  const parts = first === undefined ? rest : [change(first), ...rest];
  return { ...MEAL_ANSWER_FIXED_PLACE, plans: [{ ...plan, parts }] };
}

function withDropped(change: object): object {
  return { ...MEAL_ANSWER_UNFIT_PLACE, dropped: [{ ...dropped, ...change }] };
}

function withoutArrival({ userId, name, me, origin, leaveAt, walkMinutes, leaveBy, next }: PlanPart): object {
  return { userId, name, me, origin, leaveAt, walkMinutes, leaveBy, next };
}

describe('the stored copy of a7: 자하연식당 pressed', () => {
  it("passes the check and gives each person's arrival: 나 12:35, 민수 12:35, 지은 12:18", () => {
    expect(isAnswerReply(MEAL_ANSWER_FIXED_PLACE)).toBe(true);
    expect(plan).toMatchObject({
      id: '자하연식당 2층',
      startAt: time('12:35'),
      endAt: time('12:55'),
      togetherMinutes: 20,
    });
    expect(plan?.parts.map(({ name, arriveAt }) => [name, arriveAt])).toEqual([
      ['유상', time('12:35')],
      ['민수', time('12:35')],
      ['지은', time('12:18')],
    ]);
  });
});

describe('the stored copy of a8: 301동식당 pressed', () => {
  it("passes the check and gives the dropped Place each person's part: 나 there, 민수 12:18, 지은 12:31", () => {
    expect(isAnswerReply(MEAL_ANSWER_UNFIT_PLACE)).toBe(true);
    expect(MEAL_ANSWER_UNFIT_PLACE.plans).toEqual([]);
    expect(dropped?.place.label).toBe('301동식당');
    expect(dropped?.parts?.map(({ name, walkMinutes, arriveAt }) => [name, walkMinutes, arriveAt])).toEqual([
      ['유상', 0, time('11:50')],
      ['민수', 3, time('12:18')],
      ['지은', 16, time('12:31')],
    ]);
  });

  it('says who stays shortest and why', () => {
    expect(MEAL_ANSWER_UNFIT_PLACE.noPlan).toEqual({
      reason: 'no-fit',
      lines: [
        [{ text: '지은은 12:31에 도착해 13분만 먹어요', strong: false }],
        [{ text: '13:00 수업에 가려면 12:44엔 나서야 해요', strong: false }],
      ],
    });
  });
});

describe('the check of an arrival and of a dropped Place', () => {
  it.each([
    ['a part whose position is unknown', withFirstPart((part) => ({ ...part, arriveAt: null }))],
    ['a part without an arrival', withFirstPart(withoutArrival)],
    ['a dropped Place without parts', withDropped({ parts: undefined })],
  ])('accepts %s', (_, answer) => {
    expect(isAnswerReply(answer)).toBe(true);
  });

  it.each([
    ['an arrival that is no text', withFirstPart((part) => ({ ...part, arriveAt: 1235 }))],
    ['parts that are no list', withDropped({ parts: {} })],
    ['a part without its name', withDropped({ parts: [{ ...dropped?.parts?.[0], name: undefined }] })],
  ])('refuses %s', (_, answer) => {
    expect(isAnswerReply(answer)).toBe(false);
  });
});
