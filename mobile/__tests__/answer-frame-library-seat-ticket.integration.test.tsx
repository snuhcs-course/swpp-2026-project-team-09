/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import { SEAT_NOTES } from '@/api/mock/data/library';
import { color } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { expectNoWrite, pressIn } from './support/library-chat';
import {
  askTicket,
  EXAMPLE,
  ROOM,
  seatCardOf,
  sectorsRead,
  startTicketWorld,
  styleOf,
  ticketOf,
  type TicketWorld,
} from './support/seat-ticket';

// The seat card's ticket (P01 ticket 09): the room with its free seats and the seat, in place of the room chip, the
// gold line, the seat row and its pills, and the room list under it (board 다). The library is read for the card's
// time, 17:00–20:00.

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

describe('the seat ticket', () => {
  it('says the room with its free seats and the seat, in place of the chip and the seat row, reading only that space', async () => {
    await askTicket(world);

    expect(ticket().getByText('7층 열람실')).toBeVisible();
    expect(ticket().getByText('빈 자리 42석')).toBeVisible();
    expect(ticket().getByText('좌석')).toBeVisible();
    expect(ticket().getByText('7193번')).toBeVisible();
    expect(seatCard().getAllByText('빈 자리 42석')).toHaveLength(1);
    expect(seatCard().queryByTestId(/^room-chip-/u)).toBeNull();
    expect(seatCard().queryByText('관정관 7층 7A 열람실 2 구역 · 7193번')).toBeNull();
    expect(sectorsRead(world.library)).toEqual(['17202']);
  });

  it('draws the room and the seat at the same size, each with a chevron on its line', async () => {
    await askTicket(world);

    expect(styleOf(ticket().getByText('7층 열람실')).fontSize).toBe(styleOf(ticket().getByText('7193번')).fontSize);
    expect(ticket().getByTestId('seat-ticket-room-chevron')).toBeOnTheScreen();
    expect(ticket().getByTestId('seat-ticket-seat-chevron')).toBeOnTheScreen();
  });

  it('opens the seat picture from the seat, as 다른 자리 고르기 did', async () => {
    await askTicket(world);

    await pressIn(seatCard(), '좌석: 7193번');

    expect(screen.getByRole('button', { name: '좌석 현황 닫기' })).toBeVisible();
  });
});

describe("the ticket's seat", () => {
  it('opens the seat picture from the seat while the room list is open, and closes the list', async () => {
    await askTicket(world);
    await pass(500);
    expect(ticket().getByText('7193번')).toBeVisible();
    await pressIn(seatCard(), ROOM);

    await pressIn(seatCard(), '좌석: 7193번');

    expect(screen.getByRole('button', { name: '좌석 현황 닫기' })).toBeVisible();
    expect(seatCard().queryByText('17:00–20:00에 빈 자리')).toBeNull();
  });

  it("opens nothing from the seat while 예약하기 is on its way (PR 625's review)", async () => {
    await askTicket(world);
    world.library.holdWrites();

    await pressIn(seatCard(), '예약하기');

    expect(seatCard().getByRole('button', { name: '좌석: 7193번' })).toBeDisabled();
    world.library.release();
  });

  it('leaves the kiosk line and the cautions out of the card', async () => {
    await askTicket(world);

    expect(seatCard().queryByText(/좌석배정기에서 확인해야 해요/u)).toBeNull();
    for (const note of SEAT_NOTES.filter((one) => !one.includes('좌석배정기'))) {
      expect(seatCard().queryByText(note)).toBeNull();
    }
  });
});

describe('the room list', () => {
  it('opens under the ticket with the time and one row of one-line cells per floor, with no 그대로', async () => {
    await askTicket(world);

    await pressIn(seatCard(), ROOM);

    expect(seatCard().getByRole('button', { name: ROOM })).toBeExpanded();
    expect(seatCard().getByText('17:00–20:00에 빈 자리')).toBeVisible();
    expect(seatCard().getByText('7층')).toBeVisible();
    expect(seatCard().getByText('8층')).toBeVisible();
    for (const name of ['7층 열람실 42석', '8층 정숙 열람실 23석', '7층 노트북존 31석', '8층 노트북존 17석']) {
      expect(seatCard().getByRole('button', { name })).toBeVisible();
    }
    expect(seatCard().getByRole('button', { name: '7층 열람실 42석' })).toBeSelected();
    expect(seatCard().queryByText('어느 열람실로 할까요?')).toBeNull();
    expect(seatCard().queryByRole('button', { name: '그대로' })).toBeNull();
    expect(seatCard().queryByRole('button', { name: '예약하기' })).toBeNull();
    expect(sectorsRead(world.library).toSorted()).toEqual(
      ['17101', '17201', '17202', '17202', '17301', '18101', '18201', '18202'].toSorted(),
    );
    expect(
      world.library
        .requestsTo('getSeatBookingList')
        .every(({ body }) => body.bookTime === '1700-2000' && body.useTime === '180'),
    ).toBe(true);
  });

  it('closes from the ticket pressed again', async () => {
    await askTicket(world);
    await pressIn(seatCard(), ROOM);

    await pressIn(seatCard(), ROOM);

    expect(seatCard().queryByText('17:00–20:00에 빈 자리')).toBeNull();
    expect(seatCard().getByRole('button', { name: ROOM })).not.toBeExpanded();
    expect(seatCard().getByRole('button', { name: '예약하기' })).toBeVisible();
    expectNoWrite(world.library);
  });
});

describe("a room's count in the list", () => {
  it('says few free seats in the danger colour and the rest in the study colour', async () => {
    await askTicket(world, { free: { ...EXAMPLE, 18201: 3 } });

    await pressIn(seatCard(), ROOM);

    expect(styleOf(seatCard().getByText('3석')).color).toBe(color.danger);
    expect(styleOf(seatCard().getByText('42석')).color).toBe(color.svcStudy);
  });

  it('leaves the place of a count not known yet empty', async () => {
    await askTicket(world);
    world.library.holdSeats();

    await pressIn(seatCard(), ROOM);

    expect(seatCard().getByRole('button', { name: '8층 노트북존 빈 자리 확인 중' })).toBeVisible();
    expect(seatCard().queryByText('…')).toBeNull();
    world.library.release();
  });
});

// P01 ticket 08: the counts are kept for a minute, so the list opened again does not read the library again.
describe('the room list opened again', () => {
  it('within a minute shows the free seats at once and reads nothing more', async () => {
    await askTicket(world);
    await pressIn(seatCard(), ROOM);
    const read = sectorsRead(world.library).length;
    await pressIn(seatCard(), ROOM);

    await pressIn(seatCard(), ROOM);

    expect(seatCard().getByRole('button', { name: '7층 열람실 42석' })).toBeVisible();
    expect(seatCard().getByRole('button', { name: '8층 노트북존 17석' })).toBeVisible();
    expect(sectorsRead(world.library)).toHaveLength(read);
  });
});
