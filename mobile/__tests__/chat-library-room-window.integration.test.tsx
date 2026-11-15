/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { GROUP_ROOM, libraryCard, ROOM_NOTES } from '@/api/mock/data/library';
import { markLibraryLoggedIn } from '@/library/flag';
import { keepWaitingRoom, waitingRoomOf } from '@/library/room-bookings';
import { ALL_CONSENTED, forgetPartyRequests, SEND_ASK } from '@/screens/main/library/room-party';
import { WINDOW_OPENED } from '@/screens/main/library/waiting-room';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { openMain } from './support/main';
import { JI_WOO, MIN_JUN, REQUEST_ID, requestOf } from './support/room-requests';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, card, expectNoWrite, inCard, pressIn, startLibraryChat } from './support/library-chat';

// A study plan after the booking window (P05 ticket 07): the room card of a key that ends in `:wait` gathers the
// consents without reading the library's rooms, and says when it can be booked. The room-window Notification's
// address, `/main?card=party:<questId>`, opens that card again, bound to its request, once the window holds the date.
// Today is Monday 2 November 2026 in Korea, so the window holds the dates up to 5 November.

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

const QUEST_ID = requestOf('gathering').questId;

const PEOPLE_NOTES = ['나 17:00부터', '김민준 17:20 도착 · 19:40에 먼저 나서요', '서지우 17:00부터'];

function studyCard(key: string, date: string, minutes: number): ReturnType<typeof card> {
  return card(
    libraryCard(key, 'book', {
      space: GROUP_ROOM,
      date,
      start: '17:00',
      minutes,
      useDescOptions: ['강의', '과제', '동아리활동', '연구', '취업', '기타'],
      notes: [...PEOPLE_NOTES, ...ROOM_NOTES],
      companions: [MIN_JUN, JI_WOO],
    }),
  );
}

// Monday 9 November, whose window opens on Friday 6 November.
const NEXT_MONDAY = studyCard('book:4F-group-6:2026-11-09:1700:180:wait', '2026-11-09', 180);
// A plan that waited, for today, which the window now holds.
const TODAY = studyCard('book:4F-group-6:2026-11-02:1700:60:wait', '2026-11-02', 60);

const companionsOf = (state: 'asked' | 'consented'): NonNullable<ReturnType<typeof requestOf>['companions']> =>
  [MIN_JUN, JI_WOO].map(({ friendId, name }) => ({ userId: friendId, name, state }));

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  forgetPartyRequests();
  ({ server, library } = await startLibraryChat());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('a room card that waits for the booking window', () => {
  it('sends the request without reading the rooms, and says when it can be booked', async () => {
    const asked = requestOf('gathering', {
      date: '2026-11-09',
      minutes: 180,
      companions: companionsOf('asked'),
      moreNeeded: 0,
    });
    server.on('POST /library/room-requests', { status: 201, body: asked });
    server.on(`GET /library/room-requests/${REQUEST_ID}`, { status: 200, body: asked });
    await askForCards({ server, library }, [NEXT_MONDAY], { words: '민준, 지우랑 다음 주 월요일에 스터디' });
    const shown = inCard(`library-book-${NEXT_MONDAY.library.key}`);

    expect(shown.getByLabelText('관정관 4층 그룹스터디룸 6인실 11월 9일 (월) 17:00–20:00')).toBeVisible();
    expect(shown.getByText('· 김민준 17:20 도착 · 19:40에 먼저 나서요')).toBeVisible();
    expect(shown.getByRole('button', { name: '예약하기' })).toBeDisabled();

    await pressIn(shown, '과제');
    await pressIn(shown, SEND_ASK);
    await pass(100);

    expect(server.received('POST /library/room-requests').map(({ body }) => body)).toEqual([
      { key: NEXT_MONDAY.library.key, friendIds: [MIN_JUN.friendId, JI_WOO.friendId], useDesc: '과제' },
    ]);
    const after = inCard(`library-book-${NEXT_MONDAY.library.key}`);
    expect(after.getByText('김민준님, 서지우님의 답을 기다리고 있어요')).toBeVisible();
    expect(after.getByText('11월 6일 09:00 예약 창이 열리면 예약할 수 있어요')).toBeVisible();
    expect(after.getByRole('button', { name: '예약하기' })).toBeDisabled();
    expect(library.requestsTo('getRoomList')).toEqual([]);
    expectNoWrite(library);
    expect(await waitingRoomOf(QUEST_ID)).toEqual({
      requestId: REQUEST_ID,
      card: { ...NEXT_MONDAY.library, useDesc: '과제' },
    });
  });
});

describe('the room-window Notification’s address', () => {
  it('opens the waiting room card bound to its request, which books once everyone agreed', async () => {
    await markLibraryLoggedIn();
    await keepWaitingRoom(QUEST_ID, { requestId: REQUEST_ID, card: { ...TODAY.library, useDesc: '과제' } });
    server.on(`GET /library/room-requests/${REQUEST_ID}`, {
      status: 200,
      body: requestOf('ready', { companions: companionsOf('consented'), moreNeeded: 0 }),
    });
    await openMain();

    await act(() => {
      router.navigate(`/main?card=party:${QUEST_ID}`);
    });
    await pass(500);

    expect(screen.getByText(WINDOW_OPENED)).toBeVisible();
    const shown = inCard(`library-book-${TODAY.library.key}`);
    expect(shown.getByText(ALL_CONSENTED)).toBeVisible();
    expect(shown.getByRole('button', { name: '예약하기' })).toBeEnabled();
    expect(library.requestsTo('getRoomList')).not.toEqual([]);
    expect(server.received('POST /library/room-requests')).toEqual([]);
    expectNoWrite(library);
  });
});
