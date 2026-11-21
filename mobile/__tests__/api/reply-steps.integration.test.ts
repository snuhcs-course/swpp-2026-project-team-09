/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW } from '../support/server';
import type { ChatMessage, RequestContext } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { googleAvailable } from '@/auth/google';

// The steps of a reply that answered several requests (P03): believed when each has its kind, title, status, and
// times; a reply without them is the reply of before, and so is one whose steps this app does not know. Partitions: two
// steps, none, a step of an unknown kind, a step without its status.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const MESSAGES: ChatMessage[] = [{ role: 'user', text: '17시에 관정 갔다가 18시쯤 저녁' }];

const CONTEXT: RequestContext = {
  location: { latitude: 37.4598, longitude: 126.9521 },
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};

const REPLY = {
  text: '관정 자리는 내일 예약할 수 없어요. 저녁은 관정에서 출발해요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: null,
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

const KWANJEONG = { placeId: 'kwanjeong', label: '62-1동', latitude: 37.45903, longitude: 126.95247 };

const SEAT = {
  kind: 'seat',
  title: '7층 7A 열람실 2 구역',
  place: KWANJEONG,
  from: null,
  startAt: '2026-11-02T17:00:00+09:00',
  endAt: '2026-11-02T18:00:00+09:00',
  status: 'not-done',
  reason: '열람실은 당일만 예약할 수 있어요',
  shows: null,
};

const MEAL = {
  kind: 'meal',
  title: '저녁',
  place: null,
  from: KWANJEONG,
  startAt: '2026-11-02T18:00:00+09:00',
  endAt: null,
  status: 'shown',
  reason: null,
  shows: { kind: 'answer' },
};

describe("a reply's steps", () => {
  it('are believed and kept in order', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: { ...REPLY, steps: [SEAT, MEAL] } });

    await expect(apiClient.askAssistant(MESSAGES, CONTEXT)).resolves.toMatchObject({ steps: [SEAT, MEAL] });
  });

  it('are absent from a reply without them', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: REPLY });

    await expect(apiClient.askAssistant(MESSAGES, CONTEXT)).resolves.not.toHaveProperty('steps');
  });

  it.each([
    ['a step of an unknown kind', { ...SEAT, kind: 'shuttle' }],
    ['a step without its status', { ...MEAL, status: undefined }],
  ])('are all left out with %s, and the rest of the reply kept', async (_, step) => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: { ...REPLY, steps: [SEAT, step] } });

    const reply = await apiClient.askAssistant(MESSAGES, CONTEXT);

    expect(reply).not.toHaveProperty('steps');
    expect(reply.text).toBe(REPLY.text);
  });
});
