/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_PLAN_1 } from '@/api/mock/data/meal-answer-plan-1';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { heldBack, hold, onScreen, pressed, SENT } from '../support/plan-invitation';

// A request of "이대로 초대" that ends after its answer left the screen (P02 spec, "Inviting as it is"), with the API
// client stood in. The answer is the stored one to "배고파, 민수랑 같이"; the reply is the stored one to POST /plans.

jest.mock('@/api/client', () => ({ apiClient: { makePlanQuest: jest.fn(), listQuests: jest.fn() } }));

const make = jest.mocked(apiClient.makePlanQuest);

beforeEach(() => {
  make.mockReset();
  jest.mocked(apiClient.listQuests).mockReset().mockResolvedValue([]);
});

// Partitions of what is on screen when the reply comes: nothing (✕); another reply's answer. Of the reply: a Quest;
// a refusal. Expected values: the spec's toast for a Quest made after its answer left.
describe('a request that ends after its answer left the screen', () => {
  it.each([
    ['✕', onScreen(null, null)],
    ['a new reply', onScreen(MEAL_ANSWER_ALONE, MEAL_ANSWER_ALONE.plans[0] ?? null)],
  ])('says the Quest was made when it comes after %s', async (_, after) => {
    const reply = heldBack(make);
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));
    await pressed(held);

    await held.rerender(after);
    await reply.come(PLAN_QUEST);

    expect(held.say).toHaveBeenCalledWith(SENT);
    expect(held.invitation().made).toBeNull();
  });

  it('stays silent for a refusal that comes after ✕', async () => {
    let refuse: ((error: Error) => void) | null = null;
    make.mockImplementationOnce(
      () =>
        new Promise((_, given) => {
          refuse = given;
        }),
    );
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));
    await pressed(held);

    await held.rerender(onScreen(null, null));
    await act(async () => {
      refuse?.(new ApiError(500));
      await Promise.resolve();
    });

    expect(held.say).not.toHaveBeenCalled();
  });
});

// Partitions: a new answer while the earlier request is out; the same once it ended. Expected values: the spec's rule
// of one request at a time.
describe('one request at a time', () => {
  it('holds "sending" for the answer on screen while the earlier request is out, and sends nothing for it', async () => {
    const reply = heldBack(make);
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));
    await pressed(held);

    await held.rerender(onScreen(MEAL_ANSWER_ALONE, MEAL_ANSWER_ALONE.plans[0] ?? null));
    expect(held.invitation().sending).toBe(true);
    await pressed(held);
    expect(make).toHaveBeenCalledTimes(1);

    await reply.come(PLAN_QUEST);
    expect(held.invitation().sending).toBe(false);
  });
});
