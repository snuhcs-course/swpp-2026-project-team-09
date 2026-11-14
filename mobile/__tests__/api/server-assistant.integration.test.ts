/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW } from '../support/server';
import type { ChatMessage, RequestContext } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { googleAvailable } from '@/auth/google';

// The Assistant through the main server's client: what the app knew as the User asked goes with the request only when
// the app gives it, and only then does the app say it can draw an answer on the map. The reply's answer is believed
// only in the contract's shape.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const MESSAGES: ChatMessage[] = [{ role: 'user', text: '배고파, 민수랑 같이' }];

const CONTEXT: RequestContext = {
  location: { latitude: 37.4598, longitude: 126.9521 },
  viewport: { south: 37.455, west: 126.945, north: 37.466, east: 126.958 },
  tapped: { kind: 'friend', userId: '0b5f8a2e-6a43-4d4b-9a4b-1f3f6f1c9a02' },
  conditions: null,
  planId: null,
};

const REPLY = { text: '답이에요.', mapButtons: [], cards: [], proposal: null, answer: null };

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("the Assistant's request to the main server", () => {
  it('carries the context and both capabilities when the app gives a context', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: REPLY });

    await apiClient.askAssistant(MESSAGES, CONTEXT);

    expect(server.received('POST /assistant/messages').map(({ body }) => body)).toEqual([
      { clientCapabilities: ['library', 'answer'], context: CONTEXT, messages: MESSAGES },
    ]);
  });

  it('is the request of before, with no context and no answer, when the app gives none', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: REPLY });

    await apiClient.askAssistant(MESSAGES);

    expect(server.received('POST /assistant/messages').map(({ body }) => body)).toEqual([
      { clientCapabilities: ['library'], messages: MESSAGES },
    ]);
  });
});

describe("the Assistant's reply from the main server", () => {
  const { answer: _answer, ...BEFORE } = MEAL_ANSWER_REPLY;

  it.each([
    ['with the answer drawn on the map', MEAL_ANSWER_REPLY],
    ['with no answer, null', { ...MEAL_ANSWER_REPLY, answer: null }],
    ['of a main server before the answer, without one', BEFORE],
  ])('is believed %s', async (_, reply) => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: reply });

    await expect(apiClient.askAssistant(MESSAGES, CONTEXT)).resolves.toMatchObject(reply);
  });

  it('is refused with an answer of another shape', async () => {
    const server = await askMainServer({ signedIn: true });
    const { chips: _chips, ...malformed } = MEAL_ANSWER;
    server.on('POST /assistant/messages', { status: 200, body: { ...MEAL_ANSWER_REPLY, answer: malformed } });

    await expect(apiClient.askAssistant(MESSAGES, CONTEXT)).rejects.toMatchObject({
      status: 0,
      code: 'UNEXPECTED_ANSWER',
    });
  });
});
