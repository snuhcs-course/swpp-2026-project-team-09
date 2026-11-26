/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { answered, startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW } from '../support/server';
import type { ChatMessage, RequestContext } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { mockClient } from '@/api/mock/client';
import { EASED_ANSWER, NOT_NOW_ANSWER, NOT_NOW_ASKED, NOT_NOW_REPLY } from '@/api/mock/data/unmet-plans';
import { withOtherFriends } from '@/api/mock/other-friends';
import { googleAvailable } from '@/auth/google';

// A meal whose conditions cannot be met (P02-14): believed from the main server in the contract's shape, and answered
// by the mock, where the app asks no main server, with the main server's real answers of board n11 (nothing fits 지금)
// and n11b (eased to 13:00). The mock sends a Plan's band with its Friends as `others` (P04-64), as a main server
// since then does.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const AT_301 = { latitude: 37.4502, longitude: 126.9526 };

const CONTEXT: RequestContext = {
  location: AT_301,
  locationMissing: null,
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};

const ASKED: ChatMessage[] = [{ role: 'user', text: NOT_NOW_ASKED }];

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: the relax buttons and 지금 as the contract has them, a button and a window of other shapes.
describe('an answer that nothing fits 지금, from the main server', () => {
  it('is believed and kept with its buttons and 지금', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: NOT_NOW_REPLY });

    await expect(apiClient.askAssistant(ASKED, CONTEXT)).resolves.toMatchObject(NOT_NOW_REPLY);
  });

  it('is refused with a button of another shape', async () => {
    const server = await askMainServer({ signedIn: true });
    const noPlan = { ...NOT_NOW_ANSWER.noPlan, relax: [{ kind: 'from', label: '13:00 이후' }] };
    server.on('POST /assistant/messages', {
      status: 200,
      body: { ...NOT_NOW_REPLY, answer: { ...NOT_NOW_ANSWER, noPlan } },
    });

    await expect(apiClient.askAssistant(ASKED, CONTEXT)).rejects.toMatchObject({ code: 'UNEXPECTED_ANSWER' });
  });

  it('is refused with a 지금 that is not true or false', async () => {
    const server = await askMainServer({ signedIn: true });
    const input = { ...NOT_NOW_ANSWER.input, window: { from: null, until: null, now: 'yes' } };
    server.on('POST /assistant/messages', {
      status: 200,
      body: { ...NOT_NOW_REPLY, answer: { ...NOT_NOW_ANSWER, input } },
    });

    await expect(apiClient.askAssistant(ASKED, CONTEXT)).rejects.toMatchObject({ code: 'UNEXPECTED_ANSWER' });
  });
});

describe('the mock', () => {
  it("answers board n11's words with the main server's answer", async () => {
    await expect(answered(mockClient.askAssistant(ASKED, CONTEXT))).resolves.toEqual(NOT_NOW_REPLY);
  });

  it("recalculates 13:00 이후 with the main server's answer of board n11b", async () => {
    const input = { ...NOT_NOW_ANSWER.input, window: { from: '13:00', until: null, now: true } };

    await expect(answered(mockClient.recalculateAnswer(input, AT_301))).resolves.toEqual(
      withOtherFriends({ ...EASED_ANSWER, input }),
    );
  });

  it("goes back to board n11's answer with 지금 again", async () => {
    const { input } = NOT_NOW_ANSWER;

    await expect(answered(mockClient.recalculateAnswer(input, AT_301))).resolves.toEqual(NOT_NOW_ANSWER);
  });
});
