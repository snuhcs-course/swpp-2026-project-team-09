/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW } from '../support/server';
import type { ChatMessage, RequestContext } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { googleAvailable } from '@/auth/google';

// The buttons under a reply's words from the main server (P01 ticket 14): believed only as asks with their label and
// words, or as a Quest to cancel with its title, start, and id (P04 ticket 24); a reply without them is the reply of
// before. Partitions: one ask, a Quest to cancel, none, an offer of another kind, an ask or a Quest to cancel without
// its words.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const MESSAGES: ChatMessage[] = [{ role: 'user', text: '학생증 어디서 받아?' }];

const CONTEXT: RequestContext = {
  location: { latitude: 37.4598, longitude: 126.9521 },
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};

const WAY = { kind: 'ask', label: '가는 길 보기', text: '학생증(S-CARD) 발급받기 가는 길' };

const CANCEL = {
  kind: 'leave-quest',
  label: '취소하기',
  title: '저녁 약속',
  startsAt: '2026-10-06T18:00:00+09:00',
  questId: 'q-dinner',
};

const REPLY = {
  text: '두레문예관 2층에서 받아요.',
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

describe("the buttons under a reply's words", () => {
  it('are believed and kept as asks', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: { ...REPLY, offers: [WAY] } });

    await expect(apiClient.askAssistant(MESSAGES, CONTEXT)).resolves.toMatchObject({ offers: [WAY] });
  });

  it('are believed with a Quest to cancel', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: { ...REPLY, offers: [CANCEL] } });

    await expect(apiClient.askAssistant(MESSAGES, CONTEXT)).resolves.toMatchObject({ offers: [CANCEL] });
  });

  it('are absent from a reply without them', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: REPLY });

    await expect(apiClient.askAssistant(MESSAGES, CONTEXT)).resolves.not.toHaveProperty('offers');
  });

  it.each([
    ['an offer that opens a screen', { kind: 'open', label: '친구 추가', screen: 'friend-add' }],
    ['an ask without its words', { kind: 'ask', label: '가는 길 보기' }],
    ['a Quest to cancel without its id', { kind: 'leave-quest', label: '취소하기', title: '저녁 약속', startsAt: 'x' }],
  ])('refuse the reply with %s', async (_, offer) => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: { ...REPLY, offers: [offer] } });

    await expect(apiClient.askAssistant(MESSAGES, CONTEXT)).rejects.toMatchObject({
      status: 0,
      code: 'UNEXPECTED_ANSWER',
    });
  });
});
