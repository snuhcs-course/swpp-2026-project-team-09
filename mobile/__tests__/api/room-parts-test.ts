/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import { answered, startFresh } from '../support/mocks';
import { answerMainScreen, askMainServer, JOIN_REQUESTS, PHONE_NOW } from '../support/server';
import { apiClient } from '@/api/client';
import { mockClient } from '@/api/mock/client';
import { NOTE_SET } from '@/api/mock/data/room-parts';
import { googleAvailable } from '@/auth/google';
import { readPartyChat } from '@/storage/party-chat';

// The mocked parts of a room, which the client adds to its answers: a request's note and the 파티 채팅.

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

describe('파티 채팅', () => {
  it("starts the frame's room with the frame's conversation in the mock build", async () => {
    const messages = await apiClient.listPartyChat('q-ai');

    expect(messages.map(({ from, words }) => [from?.name ?? null, words])).toEqual([
      ['오현우', '저 조금 늦을 것 같아요. 301동 로비에서 봬요'],
      [null, '네 먼저 자리 맡아둘게요'],
    ]);
  });

  it('starts every room empty in the build that asks the main server, and keeps what the User sends', async () => {
    await askMainServer({ signedIn: true });

    expect(await apiClient.listPartyChat('q-ai')).toEqual([]);
    const sent = await apiClient.sendPartyChat(QUEST_ID, '도착했어요');

    expect(await apiClient.listPartyChat(QUEST_ID)).toEqual([sent]);
    expect(sent).toMatchObject({ from: null, words: '도착했어요', sentAt: PHONE_NOW.toISOString() });
  });

  it('keeps the messages for each signed-in User apart, and none for a User who is not signed in', async () => {
    await askMainServer({ signedIn: true });
    await apiClient.sendPartyChat(QUEST_ID, '도착했어요');

    expect(await readPartyChat('someone-else', QUEST_ID)).toEqual([]);
    expect(await readPartyChat('', QUEST_ID)).toEqual([]);
  });

  it('keeps nothing while no User is signed in', async () => {
    await askMainServer({ signedIn: false });

    await apiClient.sendPartyChat(QUEST_ID, '도착했어요');

    expect(await apiClient.listPartyChat(QUEST_ID)).toEqual([]);
  });
});
