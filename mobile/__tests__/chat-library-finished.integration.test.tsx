/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { libraryCard } from '@/api/mock/data/library';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import {
  askForCards,
  bookingRow,
  card,
  expectNoWrite,
  inCard,
  pressIn,
  reopenChat,
  SEAT_CARD,
  startLibraryChat,
} from './support/library-chat';

// A library card that booked, cancelled, returned or was dismissed, when the chat sheet closes and opens again: the
// chat keeps how it ended, so it offers no confirm button again.

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

const SEAT_TEST_ID = `library-book-${SEAT_CARD.library.key}`;
const CANCEL = card(libraryCard('cancel:-:2026-11-02:-', 'cancel', { target: { date: '2026-11-02' } }));
const RETURN = card(libraryCard('return:-', 'return', { target: {} }));

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('a finished seat card when the chat opens anew', () => {
  it('shows that it booked, and offers no 예약하기 nor another seat', async () => {
    const chat = await askForCards({ server, library }, [SEAT_CARD]);
    await pressIn(inCard(SEAT_TEST_ID), '예약하기');
    expect(library.writes()).toHaveLength(1);

    await reopenChat(chat.user);

    const shown = inCard(SEAT_TEST_ID);
    expect(shown.getByText('예약했어요')).toBeVisible();
    expect(shown.queryByRole('button', { name: '예약하기' })).toBeNull();
    expect(shown.queryByText(/7194번/u)).toBeNull();
    expect(screen.getByText('7193번 예약되었어요!')).toBeVisible();
    expect(library.writes()).toHaveLength(1);
  });

  it('stays declined after 취소', async () => {
    const chat = await askForCards({ server, library }, [SEAT_CARD]);
    await pressIn(inCard(SEAT_TEST_ID), '취소');

    await reopenChat(chat.user);

    expect(inCard(SEAT_TEST_ID).getByText('예약하지 않았어요')).toBeVisible();
    expect(inCard(SEAT_TEST_ID).queryByRole('button', { name: '예약하기' })).toBeNull();
    expectNoWrite(library);
  });
});

describe('a finished cancel or return card when the chat opens anew', () => {
  it('shows the cancel done, with no 취소하기', async () => {
    library.addBooking(bookingRow());
    const chat = await askForCards({ server, library }, [CANCEL], { words: '오늘 예약 취소해줘' });
    await pressIn(inCard(`library-cancel-${CANCEL.library.key}`), '취소하기');

    await reopenChat(chat.user);

    const shown = inCard(`library-cancel-${CANCEL.library.key}`);
    expect(shown.getByText('예약을 취소했어요')).toBeVisible();
    expect(shown.queryByRole('button', { name: '취소하기' })).toBeNull();
    expect(library.writes()).toHaveLength(1);
  });

  it('shows the return done, with no 반납하기', async () => {
    library.addBooking(bookingRow({ STATUS: 3, STATUS_NAME: '입실', USESTART: '2026-11-02 15:00:00' }));
    const chat = await askForCards({ server, library }, [RETURN], { words: '자리 반납해줘' });
    await pressIn(inCard(`library-return-${RETURN.library.key}`), '반납하기');

    await reopenChat(chat.user);

    const shown = inCard(`library-return-${RETURN.library.key}`);
    expect(shown.getByText('반납했어요. 이용해 주셔서 고마워요!')).toBeVisible();
    expect(shown.queryByRole('button', { name: '반납하기' })).toBeNull();
    expect(library.writes()).toHaveLength(1);
  });
});
