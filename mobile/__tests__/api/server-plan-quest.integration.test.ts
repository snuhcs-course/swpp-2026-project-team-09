/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW } from '../support/server';
import { apiClient } from '@/api/client';
import { BETTER_PLAN } from '@/api/mock/data/better-plan';
import { CHANGED_PLAN_QUEST } from '@/api/mock/data/changed-plan-quest';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_PLAN_1 } from '@/api/mock/data/meal-answer-plan-1';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { MakePlanQuest } from '@/api/plan-quest-types';
import { googleAvailable } from '@/auth/google';

// A Plan made into a Quest through the main server's client: the conditions of the answer and the Plan's id and start
// go to POST /plans with the Idempotency-Key, and the reply is believed only in the contract's shape. After a decline,
// the better Plan is read at GET /plans/:questId/better and the Quest changed to it at PUT /plans/:questId.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const MAKING: MakePlanQuest = {
  input: MEAL_ANSWER.input,
  planId: MEAL_PLAN_1.id,
  startAt: MEAL_PLAN_1.startAt,
  location: { latitude: 37.45016, longitude: 126.95259 },
};

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('a Plan made into a Quest by the main server', () => {
  it('posts the making with the Idempotency-Key, and gives the Quest and the invitations', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /plans', { status: 201, body: PLAN_QUEST });

    await expect(apiClient.makePlanQuest(MAKING, 'plan-key')).resolves.toEqual(PLAN_QUEST);
    expect(server.received('POST /plans').map(({ body, idempotencyKey }) => ({ body, idempotencyKey }))).toEqual([
      { body: MAKING, idempotencyKey: 'plan-key' },
    ]);
  });

  it('is refused with a reply of another shape', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /plans', { status: 201, body: { quest: PLAN_QUEST.quest } });

    await expect(apiClient.makePlanQuest(MAKING, 'plan-key')).rejects.toMatchObject({
      status: 0,
      code: 'UNEXPECTED_ANSWER',
    });
  });
});

describe('the better Plan after a decline, by the main server', () => {
  const QUEST_ID = CHANGED_PLAN_QUEST.id;
  const READ = `GET /plans/${QUEST_ID}/better`;

  it('asks with where the phone is, and gives the reply', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on(READ, { status: 200, body: BETTER_PLAN });

    await expect(apiClient.getBetterPlan(QUEST_ID, { latitude: 37.45016, longitude: 126.95259 })).resolves.toEqual(
      BETTER_PLAN,
    );
    expect(server.received(READ).map(({ query }) => query)).toEqual([{ latitude: '37.45016', longitude: '126.95259' }]);
  });

  it('asks without a location when the app knows none', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on(READ, { status: 200, body: BETTER_PLAN });

    await apiClient.getBetterPlan(QUEST_ID, null);

    expect(server.received(READ).map(({ query }) => query)).toEqual([{}]);
  });

  it('is refused with a reply of another shape', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on(READ, { status: 200, body: { current: BETTER_PLAN.current } });

    await expect(apiClient.getBetterPlan(QUEST_ID, null)).rejects.toMatchObject({
      status: 0,
      code: 'UNEXPECTED_ANSWER',
    });
  });

  it('sends the making to PUT /plans/:questId, and gives the changed Quest', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on(`PUT /plans/${QUEST_ID}`, { status: 200, body: CHANGED_PLAN_QUEST });
    const better = BETTER_PLAN.better;
    if (BETTER_PLAN.input === null || better === null) {
      throw new Error('The stored reply has a better Plan');
    }
    const making = { input: BETTER_PLAN.input, planId: better.id, startAt: better.startAt, location: null };

    await expect(apiClient.changePlanQuest(QUEST_ID, making)).resolves.toEqual(CHANGED_PLAN_QUEST);
    expect(server.received(`PUT /plans/${QUEST_ID}`).map(({ body }) => body)).toEqual([making]);
  });
});
