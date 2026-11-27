/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { STUDY_GROUP_GATHERING, STUDY_GROUP_TO_SEND } from '@/api/mock/data/study-group-answers';
import { keepRequestAnswer, requestAnswerOf } from '@/library/room-bookings';
import { forgetPartyRequests } from '@/screens/main/library/room-party';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { inDock, inFrame, startLibraryChat } from './support/library-chat';
import { openMain } from './support/main';
import { DINNER } from './support/server';
import {
  ASKED_AT,
  bookingParty,
  QUEST_ID,
  REQUEST_ID,
  requestOf,
  ROOM_MARK,
  sendTogether,
} from './support/study-group';

// Coming back to a sent request of studying together (P10 ticket 13; design group-study-resume 3 to 5): the party's
// address, which a tap on its tag or row and the pushes "모두 동의했어요" and "박민수 님이 빠졌어요" open, shows the
// same answer again, rebuilt by the main server's GET /library/room-requests/:id/answer, against the fake main server
// and the fake library.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

// The request of the server's rebuilt answer while one of three has consented.
const GATHERING_ID = STUDY_GROUP_GATHERING.plans[0]?.study?.group?.request?.id ?? '';

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  forgetPartyRequests();
  ({ server, library } = await startLibraryChat(ASKED_AT));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function openAddress(): Promise<void> {
  await openMain();
  await act(() => {
    router.navigate(`/main?card=party:${QUEST_ID}`);
  });
  await pass(500);
}

// The party with the server's rebuilt answer while one of three has consented.
function answerGathering(): void {
  server.on('GET /quests', {
    status: 200,
    body: [DINNER, bookingParty({ id: GATHERING_ID, status: 'gathering', consented: 1, asked: 3 })],
  });
  server.on(`GET /library/room-requests/${GATHERING_ID}/answer`, { status: 200, body: STUDY_GROUP_GATHERING });
  server.on(`GET /library/room-requests/${GATHERING_ID}`, {
    status: 200,
    body: { ...requestOf(['asked', 'asked', 'consented']), id: GATHERING_ID },
  });
}

// The party just sent, on a main server before GET …/:id/answer, with the answer this phone kept.
async function answerWithoutRoute(): Promise<void> {
  await keepRequestAnswer(QUEST_ID, { requestId: REQUEST_ID, answer: STUDY_GROUP_TO_SEND });
  server.on('GET /quests', {
    status: 200,
    body: [DINNER, bookingParty({ id: REQUEST_ID, status: 'gathering', consented: 0, asked: 3 })],
  });
  server.on(`GET /library/room-requests/${REQUEST_ID}/answer`, {
    status: 404,
    body: { statusCode: 404, message: `Cannot GET /library/room-requests/${REQUEST_ID}/answer`, error: 'Not Found' },
  });
  server.on(`GET /library/room-requests/${REQUEST_ID}`, { status: 200, body: requestOf(['asked', 'asked', 'asked']) });
}

// Partitions: a request gathering whose answer the server rebuilds, one on a server without the route, one booked, and
// the send that keeps the answer. Expected values: the server's fixture, the design and ticket 08's route.
describe('The address of a booking party with its request out', () => {
  it('shows the answer the server rebuilds, its ticket locked and its consents', async () => {
    answerGathering();

    await openAddress();

    expect(server.received(`GET /library/room-requests/${GATHERING_ID}/answer`)).toHaveLength(1);
    expect(screen.getByRole('button', { name: '같이 공부할 친구 추가' })).toHaveTextContent('같이 3 ›');
    expect(mapThings()).toContain(ROOM_MARK);
    expect(screen.queryByTestId('room-ticket-kind-chevron')).toBeNull();
    expect(inFrame().getByText('동의 1/3 · 박민수, 이서연 님을 기다려요')).toBeVisible();
    expect(inDock().getByRole('button', { name: '모두 동의하면 예약' })).toBeDisabled();
  });

  it('shows the answer this phone kept when the server has no such route', async () => {
    await answerWithoutRoute();

    await openAddress();

    expect(mapThings()).toContain(ROOM_MARK);
    expect(screen.queryByTestId('room-ticket-kind-chevron')).toBeNull();
    expect(inFrame().getByText('동의 0/3 · 다 받으면 알려 드려요. 닫아도 돼요.')).toBeVisible();
  });

  it('opens the party as before once its room is booked', async () => {
    server.on('GET /quests', {
      status: 200,
      body: [DINNER, bookingParty({ id: REQUEST_ID, status: 'booked', consented: 3, asked: 3 })],
    });

    await openAddress();

    expect(server.received(`GET /library/room-requests/${REQUEST_ID}/answer`)).toEqual([]);
    expect(screen.queryByTestId('study-group-body')).toBeNull();
  });
});

describe('Sending the consent requests of studying together', () => {
  it('keeps the answer on the phone by its booking party, for a server without the route', async () => {
    server.on('POST /library/room-requests', { status: 201, body: requestOf(['asked', 'asked', 'asked']) });
    server.on(`GET /library/room-requests/${REQUEST_ID}`, {
      status: 200,
      body: requestOf(['asked', 'asked', 'asked']),
    });

    await sendTogether({ server, library });

    expect(await requestAnswerOf(QUEST_ID)).toMatchObject({
      requestId: REQUEST_ID,
      answer: { input: STUDY_GROUP_TO_SEND.input },
    });
  });
});
