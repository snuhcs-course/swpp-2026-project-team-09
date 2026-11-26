/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { expectNoWrite, inFrame, pressIn, sendFromBar } from './support/library-chat';
import {
  askTicket,
  EXAMPLE,
  ROOM,
  seatCardOf,
  sectorsRead,
  startTicketWorld,
  ticketOf,
  type TicketWorld,
} from './support/seat-ticket';

// A switch of the seat card's room from the list under its ticket, a room with no free seat or not read, the list
// without a library session, and a full room swapped (P01 tickets 03 and 09).

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

let world: TicketWorld;

beforeEach(async () => {
  world = await startTicketWorld();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const seatCard = (): ReturnType<typeof seatCardOf> => seatCardOf(world);
const ticket = (): ReturnType<typeof ticketOf> => ticketOf(world);

describe('a switch of room', () => {
  it('switches the room with one tap, reads its seats, and clears the named seat, with no way back but the list', async () => {
    await askTicket(world, { seat: '7200' });
    expect(ticket().getByText('7200번')).toBeVisible();
    await pressIn(seatCard(), ROOM);

    await pressIn(seatCard(), '7층 노트북존 31석');

    expect(ticket().getByText('7층 노트북존')).toBeVisible();
    expect(ticket().getByText('빈 자리 31석')).toBeVisible();
    expect(ticket().getByText(/^\d+번$/u)).toBeVisible();
    expect(seatCard().queryByText(/7200번/u)).toBeNull();
    expect(seatCard().queryByText('7층 노트북존 가운데 빈 자리가 가장 많은 곳이에요')).toBeNull();
    expect(seatCard().queryByRole('button', { name: '처음 열람실로' })).toBeNull();
    expect(sectorsRead(world.library).at(-1)).toBe('17201');
    expectNoWrite(world.library);
  });

  it('keeps the ticket whole while the new room is read, with no sentence and no seat row (P01 ticket 09)', async () => {
    await askTicket(world, { seat: '7200' });
    await pressIn(seatCard(), ROOM);
    world.library.holdSeats();

    await pressIn(seatCard(), '7층 노트북존 31석');

    // The user's phone: "다시 확인하는 중" under the old seat, and a sentence, before the new room's seat came.
    expect(seatCard().queryByText(/다시 확인하는 중/u)).toBeNull();
    expect(seatCard().queryByText(/찾고 있어요/u)).toBeNull();
    expect(seatCard().queryByText(/ · \d+번$/u)).toBeNull();
    expect(ticket().getByText('7층 노트북존')).toBeVisible();
    expect(within(ticket().getByTestId('seat-ticket-seat')).getByText('좌석')).toBeOnTheScreen();
    world.library.release();
  });
});

describe('the room switched and booked', () => {
  it('books the room on screen, and a later turn sends the card of that room', async () => {
    const chat = await askTicket(world);
    await pressIn(seatCard(), ROOM);
    await pressIn(seatCard(), '8층 노트북존 17석');

    await pressIn(seatCard(), '예약하기');

    expect(world.library.writes().map(({ body }) => body.sectorNo)).toEqual(['18202']);
    expect(
      inFrame().getByLabelText(/^예약됨 · 오늘 \d{2}:\d{2}–\d{2}:\d{2}, 8층 노트북존, 좌석 \d+번$/u),
    ).toBeVisible();

    await sendFromBar(chat.user, '고마워');

    expect(world.server.received('POST /assistant/messages')[1]?.body).toMatchObject({
      messages: [
        { role: 'user' },
        { role: 'assistant', cards: [{ kind: 'library', id: 'book:8F-8A-zone2-notebook:2026-11-02:1700:180' }] },
        { role: 'user', text: '고마워' },
      ],
    });
  });
});

describe('a room with no free seat, or one not read', () => {
  it('cannot tap a room with no free seat, and shows "—" for a read that failed', async () => {
    await askTicket(world, { free: { ...EXAMPLE, 18202: 0, 18201: 'fail' } });
    await pressIn(seatCard(), ROOM);

    const full = seatCard().getByRole('button', { name: '8층 노트북존 만석' });
    expect(full).toBeDisabled();
    expect(seatCard().getByText('만석')).toBeVisible();
    expect(seatCard().getByText('—')).toBeVisible();
    expect(seatCard().getByRole('button', { name: '8층 정숙 열람실 빈 자리 모름' })).toBeEnabled();

    await pressIn(seatCard(), '8층 노트북존 만석');

    expect(seatCard().getByText('17:00–20:00에 빈 자리')).toBeVisible();
    expect(seatCard().getByRole('button', { name: '7층 열람실 42석' })).toBeSelected();
  });
});

describe('the room list without a library session', () => {
  it('shows the names only without a library session, reads nothing, and fills the largest space of a room', async () => {
    await askTicket(world, { loggedIn: false });

    await pressIn(seatCard(), ROOM);

    expect(seatCard().getByText('로그인하면 좌석 현황을 볼 수 있어요')).toBeVisible();
    for (const name of ['7층 열람실', '8층 정숙 열람실', '7층 노트북존', '8층 노트북존']) {
      expect(seatCard().getByRole('button', { name })).toBeVisible();
    }
    expect(world.library.requests).toEqual([]);

    await pressIn(seatCard(), '7층 노트북존');

    expect(ticket().getByText('7층 노트북존')).toBeVisible();
    expect(world.library.requests).toEqual([]);
  });
});

describe('a full room', () => {
  it('is swapped for the space of the same kind with the most free seats, and says why', async () => {
    await askTicket(world, { free: { ...EXAMPLE, 17202: 0 } });

    expect(ticket().getByText('8층 정숙 열람실')).toBeVisible();
    expect(ticket().getByText('빈 자리 23석')).toBeVisible();
    expect(seatCard().getByText('7층 열람실은 그 시간에 다 찼어요')).toBeVisible();
    expect(ticket().getByText(/^\d+번$/u)).toBeVisible();
    expect(seatCard().queryByRole('button', { name: '처음 열람실로' })).toBeNull();
    expect(seatCard().queryByText('그 시간에 빈 자리가 없어요')).toBeNull();
    expectNoWrite(world.library);
  });

  it('keeps "그 시간에 빈 자리가 없어요" when every space is full', async () => {
    const allFull = Object.fromEntries(Object.keys(EXAMPLE).map((sectorNo) => [Number(sectorNo), 0]));
    await askTicket(world, { free: allFull });

    expect(seatCard().getByText('그 시간에 빈 자리가 없어요')).toBeVisible();
    expect(seatCard().getByRole('button', { name: '좌석 현황 보기' })).toBeVisible();
    expect(ticket().getByText('7층 열람실')).toBeVisible();
  });
});
