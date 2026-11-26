/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { STUDY_BUILDINGS } from '@/api/mock/data/study-spaces';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, inCard, pressIn, SEAT_CARD, startLibraryChat } from './support/library-chat';

// A seat book card left open across its start, then booked (P15 ticket 58, the review of #360): the card holds one
// time, the next one it can book, for what it shows, the seats it reads, what it books and the done message, also while
// the booking is on its way.

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
  server.on('GET /study-spaces', { status: 200, body: STUDY_BUILDINGS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function seatCard(): ReturnType<typeof inCard> {
  return inCard(`library-book-${SEAT_CARD.library.key}`);
}

// The time of the last seat list read.
function lastSeatsRead(): string | undefined {
  return library.requestsTo('getSeatBookingList').at(-1)?.body.bookTime;
}

describe('a seat book card left open across its start', () => {
  it('books the next time it can, and keeps that one time while the booking is on its way', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    expect(seatCard().getByText('17:00–18:00 · 1시간')).toBeVisible();

    // 17:10, and the card draws again (the room chip opened and kept as it was).
    jest.setSystemTime(new Date('2026-11-02T08:10:00.000Z'));
    await pressIn(seatCard(), '열람실: 7층 열람실');
    await pressIn(seatCard(), '열람실: 7층 열람실');
    await pass(0);
    expect(seatCard().getByText('17:30–18:30 · 1시간')).toBeVisible();
    expect(lastSeatsRead()).toBe('1730-1830');

    library.holdWrites();
    await pressIn(seatCard(), '예약하기');
    await pass(0);

    expect(seatCard().getByText('예약하는 중이에요')).toBeVisible();
    expect(lastSeatsRead()).toBe('1730-1830');

    library.release();
    await pass(0);
    await pass(0);

    expect(library.writes().map(({ body }) => body.bookTime)).toEqual(['1730-1830']);
    expect(lastSeatsRead()).toBe('1730-1830');
  });
});
