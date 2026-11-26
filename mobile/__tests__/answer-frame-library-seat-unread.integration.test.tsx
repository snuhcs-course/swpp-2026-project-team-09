/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { color } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, expectNoWrite, inCard, pressIn, SEAT_CARD, startLibraryChat } from './support/library-chat';

// P02 ticket 12, n17: the seat book card whose seats could not be read, against the fake main server and the fake
// library. It says so with 다시 시도, which reads again, and 예약 안 함; a session that ended still asks for the login.

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

const UNREAD = '관정의 자리 정보를 받지 못했어요';

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function seatCard(): ReturnType<typeof inCard> {
  return inCard(`library-book-${SEAT_CARD.library.key}`);
}

// Partitions: the read failed, then answers or fails again; 예약 안 함; the session ended.
describe('the seat book card whose seats could not be read', () => {
  it('says so with 다시 시도 as the main button and 예약 안 함, and offers no seat', async () => {
    library.answerNext('network');

    await askForCards({ server, library }, [SEAT_CARD]);

    expect(seatCard().getByText(UNREAD)).toBeVisible();
    expect(seatCard().getByRole('button', { name: '다시 시도' })).toHaveStyle({ backgroundColor: color.snuBlue });
    expect(seatCard().getByRole('button', { name: '예약 안 함' })).toHaveStyle({ backgroundColor: color.surface });
    expect(seatCard().queryByRole('button', { name: '예약하기' })).toBeNull();
    expect(seatCard().queryByRole('button', { name: '로그인' })).toBeNull();
  });

  it('reads the seats again with 다시 시도, and offers the seat once they come', async () => {
    library.answerNext('network');
    await askForCards({ server, library }, [SEAT_CARD]);

    await pressIn(seatCard(), '다시 시도');

    expect(library.requestsTo('getSeatBookingList')).toHaveLength(2);
    expect(seatCard().queryByText(UNREAD)).toBeNull();
    expect(seatCard().getByText('7193번')).toBeVisible();
    expectNoWrite(library);
  });

  it('says it again after a second failure', async () => {
    library.answerNext('network');
    await askForCards({ server, library }, [SEAT_CARD]);
    library.answerNext('network');

    await pressIn(seatCard(), '다시 시도');

    expect(library.requestsTo('getSeatBookingList')).toHaveLength(2);
    expect(seatCard().getByText(UNREAD)).toBeVisible();
    expect(seatCard().getByRole('button', { name: '다시 시도' })).toBeVisible();
  });
});

describe("the unread seat book card's 예약 안 함 and session", () => {
  it('ends the card with 예약 안 함, booking nothing', async () => {
    library.answerNext('network');
    await askForCards({ server, library }, [SEAT_CARD]);

    await pressIn(seatCard(), '예약 안 함');

    expect(seatCard().getByText('예약하지 않았어요')).toBeVisible();
    expect(seatCard().queryByRole('button')).toBeNull();
    expect(library.requestsTo('getSeatBookingList')).toHaveLength(1);
    expectNoWrite(library);
  });

  it('asks for the login, as before, when the session ended', async () => {
    library.answerNext('sessionEnded');

    await askForCards({ server, library }, [SEAT_CARD]);

    expect(seatCard().getByText('관정도서관 로그인이 끝났어요. 다시 로그인해 주세요.')).toBeVisible();
    expect(seatCard().getByRole('button', { name: '로그인' })).toBeVisible();
    expect(seatCard().queryByText(UNREAD)).toBeNull();
    expect(seatCard().queryByRole('button', { name: '다시 시도' })).toBeNull();
  });
});
