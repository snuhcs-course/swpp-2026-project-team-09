/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { answered, startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW } from '../support/server';
import { KIM_MINSU, LEE_MINSU, WHICH_MINSU, WHICH_MINSU_REPLY } from '../support/which-friend';
import type { ChatMessage, RequestContext } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { mockClient } from '@/api/mock/client';
import { REFUSAL_REPLIES, type RefusalReply } from '@/api/mock/data/refusals';
import { googleAvailable } from '@/auth/google';

// A refusal in the Assistant's reply (P02 ticket 10): believed from the main server only in the contract's shape, and
// answered by the mock, where the app asks no main server, for the board's words.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const CONTEXT: RequestContext = {
  location: { latitude: 37.4598, longitude: 126.9521 },
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};

const asked = (text: string): ChatMessage[] => [{ role: 'user', text }];

function copyOf(words: string): RefusalReply {
  const reply = REFUSAL_REPLIES.get(words);
  if (reply === undefined) {
    throw new Error(`No stored refusal for ${words}`);
  }
  return reply;
}

const OFF_CAMPUS = copyOf('강남역 맛집 추천해 줘');

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("the Assistant's refusal from the main server", () => {
  const { refusal: _refusal, ...BEFORE } = OFF_CAMPUS;

  it.each([
    ['with a refusal', OFF_CAMPUS],
    ['with none, null', { ...OFF_CAMPUS, refusal: null }],
    ['of a main server before the refusal, without one', BEFORE],
  ])('is believed and kept %s', async (_, reply) => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: reply });

    await expect(apiClient.askAssistant(asked('강남역 맛집 추천해 줘'), CONTEXT)).resolves.toMatchObject(reply);
  });

  it('is refused in another shape', async () => {
    const server = await askMainServer({ signedIn: true });
    const malformed = { ...OFF_CAMPUS.refusal, offers: [{ kind: 'ask', label: '배고파' }] };
    server.on('POST /assistant/messages', { status: 200, body: { ...OFF_CAMPUS, refusal: malformed } });

    await expect(apiClient.askAssistant(asked('강남역 맛집 추천해 줘'), CONTEXT)).rejects.toMatchObject({
      status: 0,
      code: 'UNEXPECTED_ANSWER',
    });
  });

  // P02 ticket 17: the question of which Friend, which package A sends after this app is out.
  it('is believed and kept as the question of which Friend', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: WHICH_MINSU_REPLY });

    await expect(apiClient.askAssistant(asked('민수랑 점심'), CONTEXT)).resolves.toMatchObject(WHICH_MINSU_REPLY);
  });

  it('is refused when a Friend to pick has no id', async () => {
    const server = await askMainServer({ signedIn: true });
    const { userId: _id, ...noId } = KIM_MINSU;
    const malformed = { ...WHICH_MINSU, offers: [noId, LEE_MINSU] };
    server.on('POST /assistant/messages', { status: 200, body: { ...WHICH_MINSU_REPLY, refusal: malformed } });

    await expect(apiClient.askAssistant(asked('민수랑 점심'), CONTEXT)).rejects.toMatchObject({
      status: 0,
      code: 'UNEXPECTED_ANSWER',
    });
  });
});

describe('the mock of a refusal', () => {
  it.each([...REFUSAL_REPLIES.keys()])('answers "%s" with a context by the main server\'s reply', async (words) => {
    await expect(answered(mockClient.askAssistant(asked(words), CONTEXT))).resolves.toEqual(copyOf(words));
  });

  it('answers the same words without a context as before, with no refusal', async () => {
    const reply = await answered(mockClient.askAssistant(asked('셔틀 오면 알려 줘')));

    expect(reply).toEqual({
      text: '셔틀이 어디 있는지 지도에서 볼 수 있어요.',
      mapButtons: ['shuttle'],
      cards: [],
      proposal: null,
    });
  });
});
