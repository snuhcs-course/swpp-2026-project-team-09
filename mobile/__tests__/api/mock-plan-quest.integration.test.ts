/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { answered, startFresh } from '../support/mocks';
import { mockClient } from '@/api/mock/client';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_PLAN_1 } from '@/api/mock/data/meal-answer-plan-1';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';

// The mock of a Plan made into a Quest, where the app asks no main server: it answers with the main server's real
// reply for the first Plan of lunch with 민수.

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
});
