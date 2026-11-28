/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { Quest } from '@/api/types';
import { markLibraryLoggedIn } from '@/library/flag';
import { keepSeatStay } from '@/library/seat-stays';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { bookingRow, expectNoWrite, pressIn, startLibraryChat } from './support/library-chat';
import { navigate } from './support/library-session';
import { openMain } from './support/main';
import { answerParty } from './support/party';
import { DINNER } from './support/server';

// 오늘's 예약 (A04 ticket 11), against the fake main server and the fake library, on Monday 2 November 2026 at 16:00 in
// Korea: the User's 관정도서관 bookings as tickets, a press to the AI's 내 예약, and no write from 오늘.

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

// The site's main page, which it shows before and after the school's login.
const LIBRARY_MAIN = 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main';
const SEAT = bookingRow();
const SEAT_TICKET = '예약됨 · 오늘 17:00–18:00, 7층 열람실, 좌석 7193번';
// A group study room tomorrow, read after the seat though booked first.
const ROOM = bookingRow({
  BSEQNO: 3000002,
  USESTART: '2026-11-03 10:00:00',
  USEEXPIRE: '2026-11-03 12:00:00',
  FLOOR_NAME: '4층',
  ROOM_NAME: '그룹스터디실',
  SEAT_VNAME: 'G411',
  SECTORNO: 0,
});
// The seat's stay, a Quest the User holds alone (P05-14), today at 17:00.
const [DINNER_STEP] = DINNER.subQuests;
const STAY: Quest = {
  ...DINNER,
  id: 'stay-7193',
  title: '관정 7층 열람실 7193번',
  takenAlone: true,
  subQuests:
    DINNER_STEP === undefined
      ? []
      : [{ ...DINNER_STEP, id: 'stay-step', startsAt: '2026-11-02T08:00:00.000Z', endsAt: '2026-11-02T09:00:00.000Z' }],
};

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
  answerParty(server, { quests: [STAY] });
  server.on('GET /notifications', { status: 200, body: [] });
  await keepSeatStay(String(SEAT.BSEQNO), STAY.id);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function openToday({ loggedIn = true } = {}): Promise<User> {
  if (loggedIn) {
    await markLibraryLoggedIn();
  }
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: /^오늘/u }));
  await pass(500);
  return user;
}

function bookings(): ReturnType<typeof within> {
  return within(screen.getByTestId('today-bookings'));
}

function day(): ReturnType<typeof within> {
  return within(screen.getByTestId('today-day'));
}

function tickets(): string[] {
  return bookings()
    .getAllByTestId('booked-ticket')
    .map((ticket) => String(ticket.props.accessibilityLabel));
}

describe('예약', () => {
  it('lists a booked seat and a booked room as tickets, soonest first, read for today to three days on', async () => {
    library.addBooking(ROOM);
    library.addBooking(SEAT);
    await openToday();

    expect(library.requestsTo('getMyBookingList').at(-1)?.body).toEqual({ start: '20261102', end: '20261105' });
    expect(tickets()).toEqual([SEAT_TICKET, '예약됨 · 내일 10:00–12:00, 4층 그룹스터디실, 방 G411']);
    expect(bookings().getAllByRole('button', { name: '예약 취소 ›' })).toHaveLength(2);
    expectNoWrite(library);
  });

  it('is one line with 로그인 while logged out, and the seat’s stay stays in 오늘 일정', async () => {
    library.addBooking(SEAT);
    await openToday({ loggedIn: false });

    expect(bookings().getByText('관정도서관에 로그인하면 예약이 보여요')).toBeVisible();
    expect(bookings().getByRole('button', { name: '로그인' })).toBeVisible();
    expect(day().getByText(STAY.title)).toBeVisible();
  });

  it('reads once each time 오늘 comes to the front, never while another tab is', async () => {
    library.addBooking(SEAT);
    const user = await openToday();
    const read = library.requestsTo('getMyBookingList').length;

    await user.press(screen.getByRole('tab', { name: '행사' }));
    await pass(60_000);
    expect(library.requestsTo('getMyBookingList')).toHaveLength(read);

    await user.press(screen.getByRole('tab', { name: /^오늘/u }));
    await pass(500);
    expect(library.requestsTo('getMyBookingList')).toHaveLength(read + 1);
  });
});

// A seat's stay leaves 오늘 일정 only while 예약 lists its booking.
describe('a seat’s stay and 예약', () => {
  it('is hidden with no booking, and its seat stay stays in 오늘 일정', async () => {
    await openToday();

    expect(screen.queryByTestId('today-bookings')).toBeNull();
    expect(day().getByText(STAY.title)).toBeVisible();
  });

  it('takes the seat’s stay out of 오늘 일정 while it lists the seat', async () => {
    library.addBooking(SEAT);
    await openToday();

    expect(tickets()).toEqual([SEAT_TICKET]);
    expect(day().queryByText(STAY.title)).toBeNull();
  });

  it('keeps the seat’s stay in 오늘 일정 while it lists only another booking', async () => {
    library.addBooking(ROOM);
    await openToday();

    expect(tickets()).toEqual(['예약됨 · 내일 10:00–12:00, 4층 그룹스터디실, 방 G411']);
    expect(day().getByText(STAY.title)).toBeVisible();
  });
});

describe('예약 after its 로그인', () => {
  // Decided on 2026-11-29: a login that finds no booking says so, once, rather than the section going silently.
  it('says there is no booking right after its 로그인 finds none, and is hidden the next time 오늘 comes to the front', async () => {
    const user = await openToday({ loggedIn: false });

    await user.press(bookings().getByRole('button', { name: '로그인' }));
    await navigate(LIBRARY_MAIN);
    await navigate('https://nsso.snu.ac.kr/sso/login');
    await navigate(LIBRARY_MAIN);
    await pass(500);

    expect(bookings().getByText('예정된 관정도서관 예약이 없어요')).toBeVisible();
    expect(bookings().queryByRole('button', { name: '로그인' })).toBeNull();

    await user.press(screen.getByRole('tab', { name: '행사' }));
    await user.press(screen.getByRole('tab', { name: /^오늘/u }));
    await pass(500);
    expect(screen.queryByTestId('today-bookings')).toBeNull();
  });
});

// #801's review: each ask arms its own act, also after one armed before in the same run.
describe('a second ask from 예약', () => {
  it('arms the cancel again after going back to 오늘', async () => {
    library.addBooking(SEAT);
    const user = await openToday();
    await user.press(bookings().getByRole('button', { name: '예약 취소 ›' }));
    await pass(500);
    await user.press(screen.getByRole('button', { name: '답 닫기' }));
    await user.press(screen.getByRole('tab', { name: /^오늘/u }));
    await pass(500);

    await user.press(bookings().getByRole('button', { name: '예약 취소 ›' }));
    await pass(500);

    expect(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '예약 취소' })).toBeEnabled();
    expectNoWrite(library);
  });
});

describe('a press in 예약', () => {
  it('on a ticket shows the map with the AI raised and 내 예약, with nothing asked of the model', async () => {
    library.addBooking(SEAT);
    const user = await openToday();

    await user.press(bookings().getByRole('button', { name: SEAT_TICKET }));
    await pass(500);

    expect(screen.getByRole('tab', { name: /^지도/u, includeHiddenElements: true })).toBeSelected();
    expect(screen.getByTestId(/^library-myBookings-/u)).toBeVisible();
    expect(server.received('POST /assistant/messages')).toHaveLength(0);
    expectNoWrite(library);
  });

  it('on 예약 취소 arms the cancel, which only the red button sends, and the ticket is gone back on 오늘', async () => {
    library.addBooking(SEAT);
    const user = await openToday();

    await user.press(bookings().getByRole('button', { name: '예약 취소 ›' }));
    await pass(500);
    expectNoWrite(library);
    await pressIn(within(screen.getByTestId('ai-input-beside')), '예약 취소');

    expect(library.writes()).toEqual([{ endpoint: 'setCancelBooking', body: { bseqno: String(SEAT.BSEQNO) } }]);
    expect(within(screen.getByTestId(/^library-myBookings-/u)).getByText('예약을 취소했어요.')).toBeVisible();
    expect(server.received('POST /assistant/messages')).toHaveLength(0);

    await user.press(screen.getByRole('button', { name: '답 닫기' }));
    await user.press(screen.getByRole('tab', { name: /^오늘/u }));
    await pass(500);
    expect(screen.queryByTestId('today-bookings')).toBeNull();
  });
});
