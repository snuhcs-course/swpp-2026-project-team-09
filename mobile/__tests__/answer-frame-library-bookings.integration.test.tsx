/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { libraryCard } from '@/api/mock/data/library';
import { color } from '@/design-system';
import { screen } from './support/app';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import {
  askForCards,
  bookingRow,
  card,
  expectNothingOfTheLibrarySent,
  expectNoWrite,
  inCard,
  inFrame,
  pressIn,
  startLibraryChat,
} from './support/library-chat';

// The cancel and return cards and 내 예약 in the answer frame, against the fake main server and the fake library. Each
// booking is its ticket, and the act is the main button beside the input (P01 ticket 15). M4: no test sees a write
// before that press.

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

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const CANCEL = card(libraryCard('cancel:-:2026-11-02:-', 'cancel', { target: { date: '2026-11-02' } }));
const BOOKED_TICKET = '예약됨 · 오늘 17:00–18:00, 7층 열람실, 좌석 7193번';

function dock(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

describe('the cancel card', () => {
  it('shows the one matching booking as its ticket, under no words of the Assistant, and cancels it only on 예약 취소', async () => {
    library.addBooking(bookingRow());
    await askForCards({ server, library }, [CANCEL], { words: '오늘 예약 취소해줘' });
    const shown = inCard(`library-cancel-${CANCEL.library.key}`);

    expect(library.requestsTo('getMyBookingList')[0]?.body).toEqual({ start: '20261101', end: '20261105' });
    expect(shown.getByLabelText(BOOKED_TICKET)).toBeVisible();
    expect(inFrame().queryByText('카드에서 확인해 주세요.')).toBeNull();
    expect(shown.queryByRole('button', { name: '그만두기' })).toBeNull();
    expectNoWrite(library);

    await pressIn(dock(), '예약 취소');

    expect(library.writes()).toEqual([{ endpoint: 'setCancelBooking', body: { bseqno: '3000001' } }]);
    const after = inCard(`library-cancel-${CANCEL.library.key}`);
    expect(after.getByText('예약을 취소했어요.')).toBeVisible();
    expect(after.getByLabelText('취소됨 · 오늘 17:00–18:00, 7층 열람실, 좌석 7193번')).toBeVisible();
    expect(screen.queryByTestId('ai-input-beside')).toBeNull();
    expectNothingOfTheLibrarySent(server, ['3000001']);
  });

  it('lists several to choose from', async () => {
    library.addBooking(bookingRow());
    library.addBooking(bookingRow({ BSEQNO: 3000002, SEAT_VNAME: '7300', USESTART: '2026-11-02 20:00:00' }));
    await askForCards({ server, library }, [CANCEL], { words: '예약 취소' });
    const shown = inCard(`library-cancel-${CANCEL.library.key}`);

    expect(dock().getByRole('button', { name: '예약 취소' })).toBeDisabled();
    await pressIn(shown, /7300번/u, 'radio');
    await pressIn(dock(), '예약 취소');

    expect(library.writes()).toEqual([{ endpoint: 'setCancelBooking', body: { bseqno: '3000002' } }]);
  });

  it('says "취소할 예약이 없어요." when none matches', async () => {
    library.addBooking(bookingRow({ USESTART: '2026-11-03 17:00:00' }));
    await askForCards({ server, library }, [CANCEL], { words: '예약 취소' });

    expect(inCard(`library-cancel-${CANCEL.library.key}`).getByText('취소할 예약이 없어요.')).toBeVisible();
    expect(screen.queryByTestId('ai-input-beside')).toBeNull();
    expectNoWrite(library);
  });
});

describe('the cancel card the library refuses', () => {
  it("shows the library's words when it refuses the cancel", async () => {
    library.addBooking(bookingRow());
    library.refuseCancels('취소할 수 없는 예약입니다.');
    await askForCards({ server, library }, [CANCEL], { words: '예약 취소' });

    await pressIn(dock(), '예약 취소');

    expect(
      inCard(`library-cancel-${CANCEL.library.key}`).getByText('취소하지 못했어요: 취소할 수 없는 예약입니다.'),
    ).toBeVisible();
  });
});

describe('the return card', () => {
  const RETURN = card(libraryCard('return:-', 'return', { target: {} }));

  it('returns the seat in use on 반납하기', async () => {
    library.addBooking(bookingRow({ STATUS: 3, STATUS_NAME: '입실', USESTART: '2026-11-02 15:00:00' }));
    await askForCards({ server, library }, [RETURN], { words: '자리 반납해줘' });
    const shown = inCard(`library-return-${RETURN.library.key}`);
    expect(shown.getByLabelText('사용 중 · 18:00까지, 7층 열람실, 좌석 7193번')).toBeVisible();
    expectNoWrite(library);

    // 반납하기 ends the seat's use as 예약 취소 ends a booking: it is red as well (P01 ticket 21).
    expect(dock().getByText('반납하기')).toHaveStyle({ color: color.danger });
    await pressIn(dock(), '반납하기');

    expect(library.writes()).toEqual([{ endpoint: 'setCancelBooking', body: { bseqno: '3000001' } }]);
    expect(
      inCard(`library-return-${RETURN.library.key}`).getByText('반납했어요. 이용해 주셔서 고마워요!'),
    ).toBeVisible();
  });

  it('offers to cancel a seat booked and not yet used, in place of "지금 사용 중인 좌석이 없어요" (fault 1)', async () => {
    library.addBooking(bookingRow());
    await askForCards({ server, library }, [RETURN], { words: '반납해줘' });
    const shown = inCard(`library-return-${RETURN.library.key}`);

    expect(shown.getByText('아직 쓰기 전이라 반납 대신 예약을 취소할 수 있어요.')).toBeVisible();
    expect(shown.getByLabelText(BOOKED_TICKET)).toBeVisible();
    expect(dock().queryByRole('button', { name: '반납하기' })).toBeNull();
    await pressIn(dock(), '예약 취소');

    expect(library.writes()).toEqual([{ endpoint: 'setCancelBooking', body: { bseqno: '3000001' } }]);
    expect(inCard(`library-return-${RETURN.library.key}`).getByText('예약을 취소했어요.')).toBeVisible();
  });

  it('says plainly that nothing is booked or in use', async () => {
    await askForCards({ server, library }, [RETURN], { words: '반납' });

    expect(
      inCard(`library-return-${RETURN.library.key}`).getByText('지금 예약이나 사용 중인 자리가 없어요.'),
    ).toBeVisible();
    expectNoWrite(library);
  });
});

describe('the cancel card the main server shows for 반납 of a seat not yet in use', () => {
  it('says why the seat is cancelled and not returned', async () => {
    library.addBooking(bookingRow());
    await askForCards({ server, library }, [CANCEL], { words: '반납해줘' });

    expect(
      inCard(`library-cancel-${CANCEL.library.key}`).getByText('아직 쓰기 전이라 반납 대신 예약을 취소할 수 있어요.'),
    ).toBeVisible();
    expect(dock().getByRole('button', { name: '예약 취소' })).toBeEnabled();
  });
});

describe('내 예약', () => {
  const MINE = card(libraryCard('myBookings:2026-10-26:2026-11-05', 'myBookings'));

  it('shows the bookings booked or in use as tickets, and cancels one from its "예약 취소 ›" with 예약 취소', async () => {
    library.addBooking(bookingRow());
    library.addBooking(
      bookingRow({ BSEQNO: 3000002, STATUS: 5, STATUS_NAME: '본인반납', USESTART: '2026-10-30 10:00:00' }),
    );
    await askForCards({ server, library }, [MINE], { words: '내 예약 보여줘' });
    const shown = inCard(`library-myBookings-${MINE.library.key}`);

    expect(library.requestsTo('getMyBookingList')[0]?.body).toEqual({ start: '20261026', end: '20261105' });
    expect(shown.getByLabelText(BOOKED_TICKET)).toBeVisible();
    expect(shown.getByText('17:30까지 좌석배정기에서 확인해요')).toBeVisible();
    expect(shown.queryByText(/본인반납/u)).toBeNull();
    expectNoWrite(library);

    await pressIn(shown, '예약 취소 ›');
    expectNoWrite(library);
    expect(shown.queryByRole('button', { name: '예약 취소 ›' })).toBeNull();
    await pressIn(dock(), '예약 취소');

    expect(library.writes()).toEqual([{ endpoint: 'setCancelBooking', body: { bseqno: '3000001' } }]);
    expect(shown.getByText('예약을 취소했어요.')).toBeVisible();
  });

  it('says plainly when nothing is booked or in use', async () => {
    library.addBooking(
      bookingRow({ BSEQNO: 3000002, STATUS: 5, STATUS_NAME: '본인반납', USESTART: '2026-10-30 10:00:00' }),
    );
    await askForCards({ server, library }, [MINE], { words: '반납 잘 됐니?' });

    expect(
      inCard(`library-myBookings-${MINE.library.key}`).getByText('지금 예약이나 사용 중인 자리가 없어요.'),
    ).toBeVisible();
    expect(inFrame().queryByText('카드에서 확인해 주세요.')).toBeNull();
  });
});

describe("내 예약's armed step (P01 ticket 21)", () => {
  const MINE = card(libraryCard('myBookings:2026-10-26:2026-11-05', 'myBookings'));

  // A booking held and one in use, so that the card offers "예약 취소 ›" and "반납 ›".
  async function shownBookings(): Promise<ReturnType<typeof inCard>> {
    library.addBooking(bookingRow());
    library.addBooking(
      bookingRow({ BSEQNO: 3000002, STATUS: 3, STATUS_NAME: '입실', USESTART: '2026-11-02 15:00:00' }),
    );
    await askForCards({ server, library }, [MINE], { words: '내 예약 보여줘' });
    return inCard(`library-myBookings-${MINE.library.key}`);
  }

  it.each([
    ['예약 취소 ›', '예약 취소', '취소하지 않기'],
    ['반납 ›', '반납하기', '반납하지 않기'],
  ] as const)(
    'arms %s as %s in red with the ✕, which steps back to the link with nothing sent',
    async (link, act, back) => {
      const shown = await shownBookings();

      await pressIn(shown, link);
      const row = within(screen.getByTestId('confirm-row'));
      expect(row.getByText(act)).toHaveStyle({ color: color.danger });
      expect(dock().queryByRole('button', { name: '가는 길' })).toBeNull();

      await pressIn(row, back);

      expect(screen.queryByTestId('confirm-row')).toBeNull();
      expect(shown.getByRole('button', { name: link })).toBeVisible();
      expectNoWrite(library);
    },
  );
});

describe('내 예약 of a period', () => {
  it("reads the card's period, from its date to its until, and shows a past one's bookings as they ended", async () => {
    const period = {
      kind: 'library',
      library: {
        ...libraryCard('myBookings:2026-10-01:2026-10-03', 'myBookings'),
        date: '2026-10-01',
        until: '2026-10-03',
        useDescOptions: null,
      },
    };
    await askForCards({ server, library }, [period], { words: '10월 초 예약 보여줘' });
    const shown = inCard('library-myBookings-myBookings:2026-10-01:2026-10-03');

    expect(library.requestsTo('getMyBookingList')[0]?.body).toEqual({ start: '20261001', end: '20261003' });
    expect(shown.getAllByLabelText(/^예약취소 · /u).length).toBeGreaterThan(0);
    expectNoWrite(library);
  });
});
