/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { clearLibraryLoggedIn } from '@/library/flag';
import { keepRoomBooking } from '@/library/room-bookings';
import { forgetPartyRequests } from '@/screens/main/library/room-party';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { expectNoWrite, inDock, inFrame, startLibraryChat } from './support/library-chat';
import { navigate } from './support/library-session';
import { STUDY_GROUP_TO_SEND } from '@/api/mock/data/study-group-answers';
import { ASKED_AT, askTogether, FIRST_FREE, FRIENDS, REQUEST_ID, requestOf, sendTogether } from './support/study-group';

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

function useDescOf(body: unknown): unknown {
  return typeof body === 'object' && body !== null && 'useDesc' in body ? body.useDesc : null;
}

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
      { ok: true, room: FIRST_FREE },
    ]);
    expect(inFrame().getByText(`${FIRST_FREE} 예약되었어요!`)).toBeVisible();
  });
});

type User = Awaited<ReturnType<typeof sendTogether>>;

// The requests sent, and every Friend's consent read.
async function readyToBook(): Promise<User> {
  const user = await sendTogether({ server, library });
  server.on(`GET /library/room-requests/${REQUEST_ID}`, {
    status: 200,
    body: requestOf(['consented', 'consented', 'consented'], 0, 'ready'),
  });
  await pass(3500);
  return user;
}

const MAIN = 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main';

// Partitions, from #657's review: pressed again before the server knows it is booked, the library refusing, and the
// login before the booking. Expected values: today's room card.
describe('Booking the room of studying together', () => {
  it('offers 예약하기 no more for a request this phone booked, though the server still says ready', async () => {
    await keepRoomBooking(4321, REQUEST_ID);

    await readyToBook();

    expect(inFrame().getByText('모두 동의했어요')).toBeVisible();
    expect(screen.queryByRole('button', { name: '예약하기' })).toBeNull();
    expect(inDock().getByRole('button', { name: '예약했어요' })).toBeDisabled();
  });

  it("says the library's refusal and reads the rooms again", async () => {
    const user = await readyToBook();
    library.refuseBookings('예약 가능 시간이 아닙니다.');
    const reads = library.requestsTo('getRoomList').length;

    await user.press(inDock().getByRole('button', { name: '예약하기' }));
    await pass(500);

    expect(inFrame().getByText('예약하지 못했어요: 예약 가능 시간이 아닙니다.')).toBeVisible();
    expect(library.requestsTo('getRoomList').length).toBeGreaterThan(reads);
  });

  it('books once the login of "로그인하고 예약" closes, the rooms read', async () => {
    const user = await readyToBook();
    await act(() => clearLibraryLoggedIn());
    await pass(500);

    await user.press(inDock().getByRole('button', { name: '로그인하고 예약' }));
    await navigate(MAIN);
    await pass(1000);

    expect(library.writes()).toHaveLength(1);
  });
});

// Partition, from #657's emulator pictures: the request booked, as the server says once the booking is reported.
// Expected values: the card stays as while waiting, its ticket locked, nothing on it to send or choose again.
describe('The room of studying together once booked', () => {
  it('keeps its ticket locked, with no 사용 용도, 요청 취소 or 동의 요청 보내기, under the done message', async () => {
    const user = await readyToBook();
    await user.press(inDock().getByRole('button', { name: '예약하기' }));
    await pass(500);
    server.on(`GET /library/room-requests/${REQUEST_ID}`, {
      status: 200,
      body: requestOf(['consented', 'consented', 'consented'], 0, 'booked'),
    });
    await pass(3500);

    expect(inFrame().getByText(`${FIRST_FREE} 예약되었어요!`)).toBeVisible();
    expect(inFrame().getByTestId('room-ticket-kind')).toBeDisabled();
    expect(inFrame().getByTestId('room-ticket-room')).toBeDisabled();
    expect(inFrame().getByTestId('room-ticket-room')).toHaveTextContent(FIRST_FREE, { exact: false });
    expect(screen.queryByTestId('room-use-line')).toBeNull();
    expect(screen.queryByText('요청 취소')).toBeNull();
    expect(screen.queryByRole('button', { name: '동의 요청 보내기' })).toBeNull();
  });
});

// Partition: the card shown again once booked, on a phone that did not book (P10 ticket 25). Expected value: the room the
// library booked, as the request carries it (P05 ticket 68), not the room the card would choose.
describe('The room of studying together booked, shown again', () => {
  it('locks its ticket on the room the request says was booked', async () => {
    await readyToBook();
    server.on(`GET /library/room-requests/${REQUEST_ID}`, {
      status: 200,
      body: { ...requestOf(['consented', 'consented', 'consented'], 0, 'booked'), bookedRoom: 'G409' },
    });
    await pass(3500);

    expect(inFrame().getByTestId('room-ticket-room')).toHaveTextContent('G409', { exact: false });
    expect(inFrame().getByTestId('room-ticket-room')).toBeDisabled();
  });
});

// Partition, from #657's emulator pictures: no 사용 용도 chosen before 동의 요청 보내기, which once left a request everyone
// consented to with 예약하기 dimmed and no way to its use. Expected values: the user's rule, a request is sent with its
// use, as a room card's 예약하기 waits for one.
describe('A request of studying together with no use chosen', () => {
  it('is not sent until its use is chosen, so everyone consenting can always book', async () => {
    const { user } = await askTogether({ server, library }, STUDY_GROUP_TO_SEND);
    await pass(500);

    expect(inDock().getByRole('button', { name: '동의 요청 보내기' })).toBeDisabled();
    await user.press(screen.getByTestId('room-use-line'));
    await user.press(inFrame().getByRole('button', { name: '과제' }));
    await user.press(inDock().getByRole('button', { name: '동의 요청 보내기' }));
    await pass(500);
    server.on(`GET /library/room-requests/${REQUEST_ID}`, {
      status: 200,
      body: requestOf(['consented', 'consented', 'consented'], 0, 'ready'),
    });
    await pass(3500);

    expect(server.received('POST /library/room-requests').map(({ body }) => useDescOf(body))).toEqual(['과제']);
    expect(inDock().getByRole('button', { name: '예약하기' })).toBeEnabled();
  });
});
