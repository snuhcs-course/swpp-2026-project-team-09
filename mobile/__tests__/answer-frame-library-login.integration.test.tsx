/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { libraryCard, READING_ROOM, SEAT_NOTES } from '@/api/mock/data/library';
import { endLibrarySession } from '@/library/end-session';
import { hiddenTransport } from '@/library/library';
import type { TransportReply } from '@/library/transport';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import type { FakeServer } from './support/fake-server';
import { type FakeLibrary, fakeTransport } from './support/kwanjeong/fake-library';
import { askForCards, card, inCard, pressIn, SEAT_CARD, startLibraryChat } from './support/library-chat';
import { navigate } from './support/library-session';

// A 관정 login takes effect at once (P15 ticket 57): the mounted cards read again as soon as the login is done, and
// show the login line as soon as the session ends, with no second press of 로그인. Against the fake main server and
// the fake library behind the hidden view's transport.

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

const MAIN = 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main';
const NEEDS_LOGIN = '관정도서관 로그인이 필요해요';
const SEAT_TEST_ID = `library-book-${SEAT_CARD.library.key}`;
const SEATS_CARD = card(
  libraryCard('seats:7F-7A-zone2:2026-11-02', 'seats', { space: READING_ROOM, notes: SEAT_NOTES }),
);
const SEATS_TEST_ID = `library-seats-${SEATS_CARD.library.key}`;

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The login's first check, made on the main page the site serves before the school's login, answers only on
// `release`, and then with no session, as a hidden page sent off to the school's login does. Every other call is the
// fake library's.
function holdFirstCheck(): () => Promise<void> {
  const answer = fakeTransport(library).call;
  let release: (() => void) | null = null;
  jest.spyOn(hiddenTransport, 'call').mockImplementation((endpoint, body) => {
    if (endpoint === 'getMyBookingList' && release === null) {
      return new Promise<TransportReply>((resolve) => {
        release = (): void => {
          resolve({ ok: false, error: 'sessionEnded' });
        };
      });
    }
    return answer(endpoint, body);
  });
  return async () => {
    release?.();
    await pass(0);
    await pass(0);
  };
}

function seatCard(): ReturnType<typeof inCard> {
  return inCard(SEAT_TEST_ID);
}

describe('the login from a card', () => {
  it('takes effect once a check finds the session, though the landing came while the first check still ran', async () => {
    const releaseFirstCheck = holdFirstCheck();
    await askForCards({ server, library }, [SEAT_CARD], { loggedIn: false });
    expect(seatCard().getByText(NEEDS_LOGIN)).toBeVisible();

    await pressIn(seatCard(), '로그인');
    // The main page the site serves first, then the school's login, then the main page once logged in.
    await navigate(MAIN);
    await navigate('https://nsso.snu.ac.kr/sso/login');
    await navigate(MAIN);
    await releaseFirstCheck();

    expect(seatCard().queryByText(NEEDS_LOGIN)).toBeNull();
    expect(seatCard().getByText('7193번')).toBeVisible();
    expect(library.requestsTo('getSeatBookingList').length).toBeGreaterThan(0);
  });

  it('reads again on every mounted card that needed the login, not only on the pressed one', async () => {
    await askForCards({ server, library }, [SEAT_CARD, SEATS_CARD], { loggedIn: false, words: '좌석현황' });
    expect(inCard(SEAT_TEST_ID).getByText(NEEDS_LOGIN)).toBeVisible();
    expect(inCard(SEATS_TEST_ID).getByText(NEEDS_LOGIN)).toBeVisible();

    await pressIn(inCard(SEAT_TEST_ID), '로그인');
    await navigate(MAIN);
    await pass(0);
    await pass(0);

    expect(inCard(SEAT_TEST_ID).queryByText(NEEDS_LOGIN)).toBeNull();
    expect(inCard(SEATS_TEST_ID).queryByText(NEEDS_LOGIN)).toBeNull();
    expect(inCard(SEATS_TEST_ID).getByTestId('seat-map-room')).toBeVisible();
  });
});

describe('the end of the session', () => {
  it('shows the login line at once on a card that had read, once the session is ended', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    expect(inCard(SEAT_TEST_ID).getByText('7193번')).toBeVisible();

    await act(async () => {
      await endLibrarySession(fakeTransport(library));
    });
    await pass(0);

    expect(inCard(SEAT_TEST_ID).getByText(NEEDS_LOGIN)).toBeVisible();
    expect(inCard(SEAT_TEST_ID).getByRole('button', { name: '로그인' })).toBeVisible();
  });
});
