/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { RequestContext } from '@/api/assistant-types';
import { mockAssistantReply } from '@/api/mock/assistant';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { mockMadeQuests, mockPlanQuest, resetMockPlanQuests } from '@/api/mock/plan-quest';
import { withMealSet } from '@/api/mock/meal-set';

// P04 ticket 17 on the mock: once the mock's User holds a lunch made from a Plan, the mock's answer to 배고파 names it
// as the main server does (P05 tickets 16 and 17), with the main server's line, and where it is (P05 ticket 28, drawn
// by P04 ticket 20). Expected values: the stored Quests of
// `plan-quest.ts` and `taken-alone-meal.ts` (302동식당, at 11:53 alone and at 12:15 with 민수, Korea time) and the
// line P05 wrote.

const ALONE_PLAN = MEAL_ANSWER_ALONE.plans.find(({ id }) => id === '302동식당');

beforeEach(() => {
  resetMockPlanQuests();
});

// Partitions: no lunch held, one held alone, one shared with 민수.
describe("the mock's answer to 배고파 beside a lunch the User holds", () => {
  it('is the stored answer while the User holds none', () => {
    expect(withMealSet(MEAL_ANSWER_REPLY, mockMadeQuests())).toBe(MEAL_ANSWER_REPLY);
  });

  it('names a lunch held alone, which 바꾸기 may change', () => {
    const input = { ...MEAL_ANSWER_ALONE.input };
    mockPlanQuest({ input, planId: ALONE_PLAN?.id ?? '', startAt: ALONE_PLAN?.startAt ?? '', location: null });

    const reply = withMealSet(MEAL_ANSWER_REPLY, mockMadeQuests());

    expect(reply.text).toBe('이미 11:53 302동식당 점심이 있어요. 바꿀까요?');
    expect(reply.answer?.mealSet).toMatchObject({ questId: 'taken-302동식당', place: '302동식당', shared: false });
    expect(reply.answer?.planSet).toMatchObject({
      kind: 'meal-lunch',
      questId: 'taken-302동식당',
      point: { label: '302동식당', latitude: 37.44887, longitude: 126.95265 },
      people: [],
      mine: true,
      changeable: true,
    });
  });

  it('names a lunch shared with 민수, which is changed in its 파티', () => {
    mockPlanQuest();

    const reply = withMealSet(MEAL_ANSWER_REPLY, mockMadeQuests());

    expect(reply.text).toBe('이미 민수와 12:15 302동식당 점심이 있어요. 바꾸려면 그 파티에서 바꿔 주세요.');
    expect(reply.answer?.mealSet).toMatchObject({
      questId: PLAN_QUEST.quest.id,
      place: '302동식당',
      friendNames: ['민수'],
      shared: true,
    });
    expect(reply.answer?.planSet).toMatchObject({
      kind: 'meal-lunch',
      questId: PLAN_QUEST.quest.id,
      point: { label: '302동식당' },
      people: [{ name: '민수' }],
      changeable: false,
    });
  });
});

// The phone without the location permission, as the emulator is: the mock answers 배고파 from 301동 without it.
const NO_LOCATION: RequestContext = {
  location: null,
  locationMissing: 'permission',
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};

// Partitions: the answer without the location permission.
describe("the mock's 배고파 on a phone without the location permission", () => {
  it('names the lunch held alone too', () => {
    const input = { ...MEAL_ANSWER_ALONE.input };
    mockPlanQuest({ input, planId: ALONE_PLAN?.id ?? '', startAt: ALONE_PLAN?.startAt ?? '', location: null });

    const reply = mockAssistantReply([{ role: 'user', text: '배고파' }], NO_LOCATION);

    expect(reply.text).toBe('이미 11:53 302동식당 점심이 있어요. 바꿀까요?');
    expect(reply.answer?.mealSet?.shared).toBe(false);
  });
});
