/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_PLAN_1 } from '@/api/mock/data/meal-answer-plan-1';
import { MEAL_PLAN_2 } from '@/api/mock/data/meal-answer-plan-2';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { HERE } from '../support/shown-answer';
import { CHANGED, FAILED, heldBack, hold, keys, MINSU, onScreen, pressed } from '../support/plan-invitation';

// Making the Quest from the Plan on screen (P02 spec, "Inviting as it is"), with the API client stood in. The answer
// is the stored one to "배고파, 민수랑 같이", its first Plan 302동식당 and its second 301동식당; the reply is the stored
// one to POST /plans for the first, with 민수 invited.

jest.mock('@/api/client', () => ({ apiClient: { makePlanQuest: jest.fn(), listQuests: jest.fn() } }));

const make = jest.mocked(apiClient.makePlanQuest);

beforeEach(() => {
  make.mockReset();
  jest.mocked(apiClient.listQuests).mockReset().mockResolvedValue([]);
});

// Partitions: the first press; a press while it is on its way; a press after the Quest was made. Expected values:
// the spec's body, the answer's input and the Plan's id and start with the User's position.
describe('a press of "이대로 초대"', () => {
  it('sends the conditions, the Plan on screen, and the position with a key, and holds the Quest it made', async () => {
    const reply = heldBack(make);
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));

    await pressed(held);

    expect(make).toHaveBeenCalledWith(
      { input: MEAL_ANSWER.input, planId: '302동식당', startAt: '2026-11-17T12:15:00+09:00', location: HERE },
      expect.stringMatching(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/u),
    );
    expect(held.invitation().sending).toBe(true);
    await reply.come(PLAN_QUEST);
    expect(held.invitation().sending).toBe(false);
    expect(held.invitation().made).toBe(PLAN_QUEST);
    expect(held.invitation().standings).toEqual(new Map([[MINSU, { state: 'invited', lateMinutes: null }]]));
  });

  it('sends why there is no position when the app knows, as a recalculation does (P02-13 review)', async () => {
    heldBack(make);
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1), { location: null, locationMissing: 'permission' });

    await pressed(held);

    expect(make).toHaveBeenCalledWith(
      {
        input: MEAL_ANSWER.input,
        planId: '302동식당',
        startAt: '2026-11-17T12:15:00+09:00',
        location: null,
        locationMissing: 'permission',
      },
      expect.any(String),
    );
  });

  it('sends nothing while the request is on its way or after the Quest was made', async () => {
    const reply = heldBack(make);
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));

    await pressed(held);
    await pressed(held);
    await reply.come(PLAN_QUEST);
    await pressed(held);

    expect(make).toHaveBeenCalledTimes(1);
  });
});

// Partitions: a press after a failure; the same answer with another Plan; a Plan come back to after another; another
// answer (a recalculation). Expected values: the spec's rule that each Plan of the answer on screen keeps its key until
// another answer is on screen.
describe('the idempotency key', () => {
  it('is repeated by a press after a failure, and new for another Plan', async () => {
    make.mockRejectedValue(new ApiError(500));
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));

    await pressed(held);
    await pressed(held);
    await held.rerender(onScreen(MEAL_ANSWER, MEAL_PLAN_2));
    await pressed(held);

    const [first, again, other] = keys(make);
    expect(again).toBe(first);
    expect(other).not.toBe(first);
  });

  it('is the same for a Plan after another Plan was on screen in between', async () => {
    make.mockRejectedValue(new ApiError(500));
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));

    await pressed(held);
    await held.rerender(onScreen(MEAL_ANSWER, MEAL_PLAN_2));
    await held.rerender(onScreen(MEAL_ANSWER, MEAL_PLAN_1));
    await pressed(held);

    const [first, back] = keys(make);
    expect(back).toBe(first);
  });
});

// Partitions: the same Plan in a new answer object, the same conditions and a changed start.
describe('the idempotency key across a new answer object', () => {
  // P04 ticket 17, from PR 441's review: a kind chip pressed after a failure puts a new answer object on screen with
  // the same Plan; a new key then could make the Quest a second time if the first request did make it.
  it('is the same for the same Plan in a new answer object whose conditions are the same, as after a kind chip', async () => {
    make.mockRejectedValue(new ApiError(500));
    const withKind = { ...MEAL_ANSWER, input: { ...MEAL_ANSWER.input, cuisine: '한식' as const } };
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));

    await pressed(held);
    await held.rerender(onScreen(withKind, MEAL_PLAN_1));
    await pressed(held);

    const [first, after] = keys(make);
    expect(after).toBe(first);
  });

  it('is new for the same Plan once its start changed', async () => {
    make.mockRejectedValue(new ApiError(500));
    const later = { ...MEAL_PLAN_1, startAt: '2026-11-17T12:25:00+09:00' };
    const moved = { ...MEAL_ANSWER, plans: [later, ...MEAL_ANSWER.plans.slice(1)] };
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));

    await pressed(held);
    await held.rerender(onScreen(moved, later));
    await pressed(held);

    const [first, after] = keys(make);
    expect(after).not.toBe(first);
  });
});

// Partitions: 409 PLAN_CHANGED; another refusal; no answer at all. Expected values: the spec's toasts.
describe('a refused press', () => {
  it('after PLAN_CHANGED says so and recalculates from conditions equal to the same, as a new object', async () => {
    make.mockRejectedValueOnce(new ApiError(409, 'PLAN_CHANGED'));
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));

    await pressed(held);

    expect(held.say).toHaveBeenCalledWith(CHANGED);
    const [alter] = held.change.mock.calls[0] ?? [];
    const input = alter?.(MEAL_ANSWER.input);
    expect(input).toEqual(MEAL_ANSWER.input);
    expect(input).not.toBe(MEAL_ANSWER.input);
  });

  it.each([
    ['a 409 of another code', new ApiError(409, 'PLAN_ALONE')],
    ['a 500', new ApiError(500)],
    ['no answer at all', new TypeError('Network request failed')],
  ])('after %s says it could not invite, and changes nothing else', async (_, error) => {
    make.mockRejectedValueOnce(error);
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));

    await pressed(held);

    expect(held.say).toHaveBeenCalledWith(FAILED);
    expect(held.change).not.toHaveBeenCalled();
    expect(held.invitation()).toMatchObject({ sending: false, made: null });
  });
});

// Partitions: another answer on screen after the Quest was made; ✕ while the request is on its way.
describe('the Quest made', () => {
  it('is dropped with the answer', async () => {
    make.mockResolvedValueOnce(PLAN_QUEST);
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));
    await pressed(held);
    expect(held.invitation().made).toBe(PLAN_QUEST);

    await held.rerender(onScreen(null, null));

    expect(held.invitation()).toMatchObject({ sending: false, made: null, standings: new Map() });
  });

  it('is never shown when it comes after the answer was closed', async () => {
    const reply = heldBack(make);
    const held = await hold(onScreen(MEAL_ANSWER, MEAL_PLAN_1));
    await pressed(held);

    await held.rerender(onScreen(null, null));
    await reply.come(PLAN_QUEST);

    expect(held.invitation()).toMatchObject({ sending: false, made: null, standings: new Map() });
  });
});
