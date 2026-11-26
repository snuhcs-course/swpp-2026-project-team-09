/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { Place } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapThings } from './support/answer-map';
import { bookingRow } from './support/booking-row';
import { PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, SEAT_CARD, startLibraryChat } from './support/library-chat';
import { layStage } from './support/lists';

// A seat booked on the map (P01 ticket 15): the done message is the seat's ticket, booked, with one line that says when
// to confirm it at the 좌석배정기, which is the booked start + 30 minutes, and "예약 취소 ›"; 가는 길 stands beside the
// input in place of 확인. "예약 취소 ›" turns it into 예약 취소, which cancels the booking, greys the ticket, and takes
// the map's mark away.

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

const KWANJEONG: Place = {
  id: 'p62-1',
  number: '62-1',
  name: '중앙도서관 관정관',
  latitude: 37.45903,
  longitude: 126.95247,
};
const TICKET = /^예약됨 · 오늘 17:00–18:00, 7층 열람실, 좌석 \d+번$/u;
const BOOKED_MARK = /^관정 7층 열람실 · 17:00 · \d+번 · 예약됨$/u;

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
  server.on('GET /places', { status: 200, body: [...PLACES, KWANJEONG] });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function dock(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

async function booked(): Promise<Awaited<ReturnType<typeof askForCards>>> {
  const chat = await askForCards({ server, library }, [SEAT_CARD]);
  await layStage(390, 760);
  await pass(500);
  await chat.user.press(dock().getByRole('button', { name: '예약하기' }));
  await pass(500);
  return chat;
}

describe('a seat booked on the map', () => {
  it('is its ticket, booked, with the time to confirm it and the walk there, and 가는 길 beside the input', async () => {
    await booked();
    const done = within(screen.getByTestId('library-done'));

    expect(done.getByLabelText(TICKET)).toBeVisible();
    expect(done.getByText(/^(\d{2}:\d{2}|지금) 출발 · 17:30까지 좌석배정기 확인$/u)).toBeVisible();
    expect(done.getByRole('button', { name: '예약 취소 ›' })).toBeVisible();
    for (const gone of ['✓ 예약했어요', '카드에서 확인해 주세요.', /예약 번호/u, /다 쓰면 꼭 반납해 주세요/u]) {
      expect(screen.queryByText(gone)).toBeNull();
    }
    for (const gone of ['좌석 현황 보기', '길 안내', '확인']) {
      expect(screen.queryByRole('button', { name: gone })).toBeNull();
    }
    expect(dock().getByRole('button', { name: '가는 길' })).toBeEnabled();
    expect(mapThings()).toContainEqual(expect.stringMatching(BOOKED_MARK));
    expect(within(screen.getByTestId('answer-card')).getByRole('button', { name: '답 닫기' })).toBeVisible();
  });

  it('is cancelled only on 예약 취소, after "예약 취소 ›", and then greys, says so, and leaves the map', async () => {
    const { user } = await booked();

    await user.press(screen.getByRole('button', { name: '예약 취소 ›' }));
    await pass(500);

    expect(library.requestsTo('setCancelBooking')).toEqual([]);
    expect(screen.queryByRole('button', { name: '예약 취소 ›' })).toBeNull();
    await user.press(dock().getByRole('button', { name: '예약 취소' }));
    await pass(500);

    expect(library.requestsTo('setCancelBooking')).toEqual([
      { endpoint: 'setCancelBooking', body: { bseqno: '2000001' } },
    ]);
    const done = within(screen.getByTestId('library-done'));
    expect(done.getByText('예약을 취소했어요.')).toBeVisible();
    expect(done.getByLabelText(/^취소됨 · 오늘 17:00–18:00, 7층 열람실, 좌석 \d+번$/u)).toBeVisible();
    expect(mapThings().some((thing) => BOOKED_MARK.test(thing))).toBe(false);
    expect(screen.queryByRole('button', { name: '가는 길' })).toBeNull();
  });
});

describe('a seat booked on the map, whose start the library moved', () => {
  it('takes the start the library holds for it when it is not the one sent, and says so (fault 4)', async () => {
    library.addBooking(
      bookingRow({ BSEQNO: 2000001, USESTART: '2026-11-02 17:10:00', USEEXPIRE: '2026-11-02 18:00:00' }),
    );
    await booked();
    const done = within(screen.getByTestId('library-done'));

    expect(done.getByText(/17:40까지 좌석배정기/u)).toBeVisible();
    expect(done.getByText('도서관이 정한 시작: 17:10')).toBeVisible();
  });
});
