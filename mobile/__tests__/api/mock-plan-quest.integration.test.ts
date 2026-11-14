/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { answered, startFresh } from '../support/mocks';
import { mockClient } from '@/api/mock/client';
import { BETTER_PLAN } from '@/api/mock/data/better-plan';
import { CHANGED_PLAN_QUEST } from '@/api/mock/data/changed-plan-quest';
import { ME } from '@/api/mock/data/frame';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_PLAN_1 } from '@/api/mock/data/meal-answer-plan-1';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';

// The mocks of a Plan made into a Quest and of the better Plan after a decline, where the app asks no main server: each
// answers with the main server's real reply.

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the mock of a Plan made into a Quest', () => {
  it("answers with the main server's real reply", async () => {
    const making = { input: MEAL_ANSWER.input, planId: MEAL_PLAN_1.id, startAt: MEAL_PLAN_1.startAt, location: null };

    await expect(answered(mockClient.makePlanQuest(making, 'key'))).resolves.toEqual(PLAN_QUEST);
  });

  // Partitions: the User's Quests before any Quest was made, and after one was.
  it("lists the Quest it made among the User's, led by the mock's User, and none before", async () => {
    const making = { input: MEAL_ANSWER.input, planId: MEAL_PLAN_1.id, startAt: MEAL_PLAN_1.startAt, location: null };
    const before = await answered(mockClient.listQuests());

    await answered(mockClient.makePlanQuest(making, 'key'));
    const after = await answered(mockClient.listQuests());

    expect(before.some(({ id }) => id === PLAN_QUEST.quest.id)).toBe(false);
    const made = after.find(({ id }) => id === PLAN_QUEST.quest.id);
    expect(made?.leader).toEqual(ME);
    expect(made?.holders).toEqual([ME]);
    expect(made?.members?.map(({ user, state }) => [user.name, state])).toEqual([
      [ME.name, 'accepted'],
      ['민수', 'invited'],
    ]);
    expect(made?.subQuests).toEqual(PLAN_QUEST.quest.subQuests);
  });
});

describe('the mock of the better Plan after a decline', () => {
  it("answers with the main server's real reply after 지은 declined", async () => {
    await expect(answered(mockClient.getBetterPlan(CHANGED_PLAN_QUEST.id, null))).resolves.toEqual(BETTER_PLAN);
  });

  it("answers a change with the main server's real Quest", async () => {
    const making = { input: MEAL_ANSWER.input, planId: MEAL_PLAN_1.id, startAt: MEAL_PLAN_1.startAt, location: null };

    await expect(answered(mockClient.changePlanQuest(CHANGED_PLAN_QUEST.id, making))).resolves.toEqual(
      CHANGED_PLAN_QUEST,
    );
  });
});
