/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { forgetPartyRequests } from '@/screens/main/library/room-party';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { expectNoWrite, inDock, inFrame, startLibraryChat } from './support/library-chat';
import { ASKED_AT, FIRST_FREE, FRIENDS, REQUEST_ID, requestOf, sendTogether } from './support/study-group';

// Booking the room of the study answer together once everyone has consented (P10 ticket 14; design group-study-design
// 다, group-study-resume 5): today's booking behind the group answer's card, against the fake main server and the fake
// library.

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

const COMPANIONS = FRIENDS.map(({ userId, name }, index) => ({
  userId,
  registeredName: name,
  studentNumber: `2026-0000${String(index + 2)}`,
}));

function userNameOf(body: unknown): unknown {
  return typeof body === 'object' && body !== null && 'pUserName' in body ? body.pUserName : null;
}

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  forgetPartyRequests();
  ({ server, library } = await startLibraryChat(ASKED_AT));
  server.on('POST /library/room-requests', { status: 201, body: requestOf(['asked', 'asked', 'asked']) });
  server.on(`GET /library/room-requests/${REQUEST_ID}`, { status: 200, body: requestOf(['asked', 'asked', 'asked']) });
  server.on(`GET /library/room-requests/${REQUEST_ID}/companions`, { status: 200, body: COMPANIONS });
  server.on(`POST /library/room-requests/${REQUEST_ID}/result`, { status: 204 });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: every consent in, then 예약하기. Expected values: the design and today's room booking.
describe('The room of studying together once everyone has consented', () => {
  it('says so and offers 예약하기, which checks each Friend, books the room with the four and reports it', async () => {
    const user = await sendTogether({ server, library });
    server.on(`GET /library/room-requests/${REQUEST_ID}`, {
      status: 200,
      body: requestOf(['consented', 'consented', 'consented'], 0, 'ready'),
    });
    await pass(3500);

    expect(inFrame().getByText('모두 동의했어요')).toBeVisible();
    expectNoWrite(library);
    await user.press(inDock().getByRole('button', { name: '예약하기' }));
    await pass(500);

    expect(library.requestsTo('getUserCheck').map(({ body }) => userNameOf(body))).toEqual(
      FRIENDS.map(({ name }) => name),
    );
    expect(library.writes()).toHaveLength(1);
    expect(server.received(`POST /library/room-requests/${REQUEST_ID}/result`).map(({ body }) => body)).toEqual([
      { ok: true },
    ]);
    expect(inFrame().getByText(`${FIRST_FREE} 예약되었어요!`)).toBeVisible();
  });
});
