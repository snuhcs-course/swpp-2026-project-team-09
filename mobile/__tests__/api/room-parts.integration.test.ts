/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { answered, startFresh } from '../support/mocks';
import { answerMainScreen, askMainServer, JOIN_REQUESTS, PHONE_NOW } from '../support/server';
import { apiClient } from '@/api/client';
import { mockClient } from '@/api/mock/client';
import { NOTE_SET } from '@/api/mock/data/room-parts';
import { googleAvailable } from '@/auth/google';

// The mocked part of a room, which the client adds to its answers: a request's note.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const QUEST_ID = '9a7e0c1d-0000-4f00-8000-0000000a0001';

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("a request's note", () => {
  it('is one of the mock set in the mock build, the same for the same request', async () => {
    jest.spyOn(mockClient, 'listJoinRequests').mockResolvedValue(JOIN_REQUESTS);

    const first = await answered(apiClient.listJoinRequests('q-ai'));
    const again = await answered(apiClient.listJoinRequests('q-ai'));

    for (const request of first) {
      expect(NOTE_SET).toContain(request.note);
    }
    expect(again.map(({ note }) => note)).toEqual(first.map(({ note }) => note));
  });

  it('is none in the build that asks the main server', async () => {
    const server = await askMainServer({ signedIn: true });
    answerMainScreen(server);
    server.on(`GET /quests/${QUEST_ID}/join-requests`, { status: 200, body: JOIN_REQUESTS });

    const requests = await apiClient.listJoinRequests(QUEST_ID);

    expect(requests.map(({ id, note }) => ({ id, note }))).toEqual([
      { id: 'jr1', note: null },
      { id: 'jr2', note: null },
    ]);
  });
});
