/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW } from '../support/server';
import { apiClient } from '@/api/client';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_PLAN_1 } from '@/api/mock/data/meal-answer-plan-1';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { MakePlanQuest } from '@/api/plan-quest-types';
import { googleAvailable } from '@/auth/google';

// A Plan made into a Quest through the main server's client: the conditions of the answer and the Plan's id and start
// go to POST /plans with the Idempotency-Key, and the reply is believed only in the contract's shape.

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
