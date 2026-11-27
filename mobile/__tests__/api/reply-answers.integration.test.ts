/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW } from '../support/server';
import type { ChatMessage, MealInput, RequestContext } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { googleAvailable } from '@/auth/google';

// The answers of a reply to an app that says `answers` (P03 ticket 20), against the fake main server: each with its
// request's key, the keys withdrawn, the request of a plan chosen, a step naming its answer by key, and a chained start
// set by the step before; a recalculation keeps the key it comes back with. Partitions: all of them believed; an answer
// of `answers` without its key; a reply without any of them.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const MESSAGES: ChatMessage[] = [{ role: 'user', text: '점심이랑 저녁 짜줘' }];

const CONTEXT: RequestContext = {
  location: { latitude: 37.4598, longitude: 126.9521 },
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};

const DINNER_INPUT: MealInput = {
  ...MEAL_ANSWER.input,
  meal: 'dinner',
  people: MEAL_ANSWER.input.people.map((person, at) =>
    at === 0
      ? {
          ...person,
          constraints: [
            { kind: 'from', placeId: 'e3b13da4-ec15-5b6e-ba98-a0fd4346e08b', source: 'step' },
            { kind: 'notBefore', time: '13:00', source: 'step' },
          ],
        }
      : person,
  ),
};

const LUNCH = { ...MEAL_ANSWER, key: 'meal 2026-11-17 lunch' };
const DINNER = { ...MEAL_ANSWER, input: DINNER_INPUT, key: 'meal 2026-11-17 dinner' };

const stepOf = (key: string, title: string): object => ({
  kind: 'meal',
  title,
  place: {
    placeId: 'e3b13da4-ec15-5b6e-ba98-a0fd4346e08b',
    label: '학생회관식당',
    latitude: 37.45932,
    longitude: 126.95058,
  },
  from: null,
  startAt: '2026-11-17T12:00:00+09:00',
  endAt: '2026-11-17T13:00:00+09:00',
  status: 'shown',
  reason: null,
  shows: { kind: 'answer', key },
});

const REPLY = {
  ...MEAL_ANSWER_REPLY,
  answer: DINNER,
  answers: [LUNCH, DINNER],
  withdrawn: ['meal 2026-11-16 dinner'],
  select: { planId: MEAL_ANSWER.plans[0]?.id, key: LUNCH.key },
  steps: [stepOf(LUNCH.key, '점심'), stepOf(DINNER.key, '저녁')],
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

describe("a reply's answers by key", () => {
  it('are believed with the keys withdrawn, the request of the plan chosen, and the steps by key', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: REPLY });

    const reply = await apiClient.askAssistant(MESSAGES, CONTEXT);

    expect(reply.answers?.map(({ key }) => key)).toEqual([LUNCH.key, DINNER.key]);
    expect(reply.answers?.[1]?.input).toEqual(DINNER_INPUT);
    expect(reply).toMatchObject({ withdrawn: REPLY.withdrawn, select: REPLY.select, steps: REPLY.steps });
  });

  it('fail the reply when an answer of them has no key, as any answer the app cannot read does', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: { ...REPLY, answers: [MEAL_ANSWER] } });

    await expect(apiClient.askAssistant(MESSAGES, CONTEXT)).rejects.toThrow();
  });

  it('are absent from a reply without them, which is read as before', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: MEAL_ANSWER_REPLY });

    const reply = await apiClient.askAssistant(MESSAGES, CONTEXT);

    expect(reply).not.toHaveProperty('answers');
    expect(reply).not.toHaveProperty('withdrawn');
    expect(reply.answer).toEqual(MEAL_ANSWER_REPLY.answer);
  });
});

describe("a recalculation's answer", () => {
  it('keeps the key of the request it now answers', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/answers', { status: 200, body: DINNER });

    await expect(apiClient.recalculateAnswer(DINNER_INPUT, null)).resolves.toMatchObject({ key: DINNER.key });
  });
});
