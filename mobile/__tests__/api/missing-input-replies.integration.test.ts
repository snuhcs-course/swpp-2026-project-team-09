/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { answered, startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW } from '../support/server';
import type { ChatMessage, RequestContext } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { mockClient } from '@/api/mock/client';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { NO_LOCATION_REPLY, NO_TIMETABLE_REPLY } from '@/api/mock/data/missing-inputs';
import { googleAvailable } from '@/auth/google';

// An answer that says what was missing (P02-13): believed from the main server in the contract's shape, and answered
// by the mock, where the app asks no main server, with the main server's real answers to "배고파" without the location
// permission (board n13) and with no Class in the Timetable (board n15).

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const AT_301 = { latitude: 37.4502, longitude: 126.9526 };

const context = (more: Partial<RequestContext> = {}): RequestContext => ({
  location: AT_301,
  locationMissing: null,
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
  ...more,
});

const HUNGRY: ChatMessage[] = [{ role: 'user', text: '배고파' }];

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('an answer with what was missing, from the main server', () => {
  it.each([
    ['without the location permission', NO_LOCATION_REPLY],
    ['without a Timetable', NO_TIMETABLE_REPLY],
  ])('is believed and kept %s', async (_, reply) => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /assistant/messages', { status: 200, body: reply });

    await expect(apiClient.askAssistant(HUNGRY, context())).resolves.toMatchObject(reply);
  });

  it('is refused with an offer of another shape', async () => {
    const server = await askMainServer({ signedIn: true });
    const answer = { ...NO_LOCATION_REPLY.answer, offers: [{ kind: 'open', label: '위치 켜기' }] };
    server.on('POST /assistant/messages', { status: 200, body: { ...NO_LOCATION_REPLY, answer } });

    await expect(apiClient.askAssistant(HUNGRY, context())).rejects.toMatchObject({
      status: 0,
      code: 'UNEXPECTED_ANSWER',
    });
  });
});

describe('the mock of 배고파', () => {
  it("answers without the location permission by the main server's answer of board n13", async () => {
    const reply = await answered(
      mockClient.askAssistant(HUNGRY, context({ location: null, locationMissing: 'permission' })),
    );

    expect(reply).toEqual(NO_LOCATION_REPLY);
  });

  it("answers with no Class in the mock's Timetable by the main server's answer of board n15", async () => {
    await answered(mockClient.resetTimetable());

    await expect(answered(mockClient.askAssistant(HUNGRY, context()))).resolves.toEqual(NO_TIMETABLE_REPLY);
  });

  it('answers as before with the location and a Timetable', async () => {
    await expect(answered(mockClient.askAssistant(HUNGRY, context()))).resolves.toEqual(MEAL_ANSWER_REPLY);
  });
});
