/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { libraryCard } from '@/api/mock/data/library';
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
  pressIn,
  startLibraryChat,
} from './support/library-chat';

// The cancel and return cards and 내 예약 in the chat, against the fake main server and the fake library. M4: no test
// sees a write before the confirm press.

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

describe('the cancel card', () => {
  it('finds the one matching booking and cancels it only on 취소하기', async () => {
    library.addBooking(bookingRow());
    await askForCards({ server, library }, [CANCEL], { words: '오늘 예약 취소해줘' });
    const shown = inCard(`library-cancel-${CANCEL.library.key}`);

    expect(library.requestsTo('getMyBookingList')[0]?.body).toEqual({ start: '20261101', end: '20261105' });
    expect(shown.getByText('7층 7A 열람실 · 7193번 · 오늘 17:00–18:00')).toBeVisible();
    expectNoWrite(library);

    await pressIn(shown, '취소하기');

    expect(library.writes()).toEqual([{ endpoint: 'setCancelBooking', body: { bseqno: '3000001' } }]);
    expect(inCard(`library-cancel-${CANCEL.library.key}`).getByText('예약을 취소했어요')).toBeVisible();
    expectNothingOfTheLibrarySent(server, ['3000001']);
  });

  it('lists several to choose from', async () => {
    library.addBooking(bookingRow());
    library.addBooking(bookingRow({ BSEQNO: 3000002, SEAT_VNAME: '7300', USESTART: '2026-11-02 20:00:00' }));
    await askForCards({ server, library }, [CANCEL], { words: '예약 취소' });
    const shown = inCard(`library-cancel-${CANCEL.library.key}`);

    expect(shown.getByRole('button', { name: '취소하기' })).toBeDisabled();
    await pressIn(shown, /7300번/u, 'radio');
    await pressIn(shown, '취소하기');

    expect(library.writes()).toEqual([{ endpoint: 'setCancelBooking', body: { bseqno: '3000002' } }]);
  });

  it('says "취소할 예약이 없어요" when none matches', async () => {
    library.addBooking(bookingRow({ USESTART: '2026-11-03 17:00:00' }));
    await askForCards({ server, library }, [CANCEL], { words: '예약 취소' });

    expect(inCard(`library-cancel-${CANCEL.library.key}`).getByText('취소할 예약이 없어요')).toBeVisible();
    expectNoWrite(library);
  });
});

describe('the cancel card when nothing is to be cancelled', () => {
  it('sends nothing on 그만두기', async () => {
    library.addBooking(bookingRow());
    await askForCards({ server, library }, [CANCEL], { words: '예약 취소' });
    const shown = inCard(`library-cancel-${CANCEL.library.key}`);

    await pressIn(shown, '그만두기');

    const after = inCard(`library-cancel-${CANCEL.library.key}`);
    expect(after.getByText('그만뒀어요')).toBeVisible();
    expect(after.queryByRole('button', { name: '취소하기' })).toBeNull();
    expectNoWrite(library);
  });

  it("shows the library's words when it refuses the cancel", async () => {
    library.addBooking(bookingRow());
    library.refuseCancels('취소할 수 없는 예약입니다.');
    await askForCards({ server, library }, [CANCEL], { words: '예약 취소' });
    const shown = inCard(`library-cancel-${CANCEL.library.key}`);

    await pressIn(shown, '취소하기');

    expect(shown.getByText('취소하지 못했어요: 취소할 수 없는 예약입니다.')).toBeVisible();
  });
});

describe('the return card', () => {
  const RETURN = card(libraryCard('return:-', 'return', { target: {} }));

  it('returns the seat in use on 반납하기', async () => {
    library.addBooking(bookingRow({ STATUS: 3, STATUS_NAME: '입실', USESTART: '2026-11-02 15:00:00' }));
    await askForCards({ server, library }, [RETURN], { words: '자리 반납해줘' });
    const shown = inCard(`library-return-${RETURN.library.key}`);
    expectNoWrite(library);

    await pressIn(shown, '반납하기');

    expect(library.writes()).toEqual([{ endpoint: 'setCancelBooking', body: { bseqno: '3000001' } }]);
    expect(
      inCard(`library-return-${RETURN.library.key}`).getByText('반납했어요. 이용해 주셔서 고마워요!'),
    ).toBeVisible();
  });

  it('says "지금 사용 중인 좌석이 없어요" with none in use', async () => {
    await askForCards({ server, library }, [RETURN], { words: '반납' });

    expect(inCard(`library-return-${RETURN.library.key}`).getByText('지금 사용 중인 좌석이 없어요')).toBeVisible();
    expectNoWrite(library);
  });
});

describe('내 예약', () => {
  const MINE = card(libraryCard('myBookings:2026-10-26:2026-11-05', 'myBookings'));

  it('lists a week back to three days on with STATUS_NAME, and 취소 or 반납 on the rows that allow it', async () => {
    library.addBooking(bookingRow());
    library.addBooking(
      bookingRow({ BSEQNO: 3000002, STATUS: 5, STATUS_NAME: '본인반납', USESTART: '2026-10-30 10:00:00' }),
    );
    await askForCards({ server, library }, [MINE], { words: '내 예약 보여줘' });
    const shown = inCard(`library-myBookings-${MINE.library.key}`);

    expect(library.requestsTo('getMyBookingList')[0]?.body).toEqual({ start: '20261026', end: '20261105' });
    expect(shown.getByText('예약')).toBeVisible();
    expect(shown.getByText('본인반납')).toBeVisible();
    expect(shown.getAllByRole('button', { name: /취소$/u })).toHaveLength(1);
    expectNoWrite(library);

    await pressIn(shown, /취소$/u);
    expectNoWrite(library);
    await pressIn(shown, '취소하기');

    expect(library.writes()).toEqual([{ endpoint: 'setCancelBooking', body: { bseqno: '3000001' } }]);
    expect(shown.getByText('예약을 취소했어요')).toBeVisible();
    expect(shown.getByText('예약취소')).toBeVisible();
  });
});

describe('내 예약 of a period', () => {
  it("reads the card's period, from its date to its until, as ticket 07's card sends it", async () => {
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
    expect(shown.getAllByText('예약취소').length).toBeGreaterThan(0);
    expectNoWrite(library);
  });
});
