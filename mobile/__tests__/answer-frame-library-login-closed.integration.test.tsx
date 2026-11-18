/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { endLibrarySession } from '@/library/end-session';
import { isLibraryLoggedIn } from '@/library/flag';
import { hiddenTransport } from '@/library/library';
import { LOGIN_LIMIT_MS } from '@/library/login-view';
import { LIBRARY_LOGOUT_URL } from '@/library/site';
import type { TransportReply } from '@/library/transport';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { type FakeLibrary, fakeTransport } from './support/kwanjeong/fake-library';
import { askForCards, inCard, pressIn, SEAT_CARD, startLibraryChat } from './support/library-chat';
import { loadHidden, navigate } from './support/library-session';
import { shownWebViews, webViewAt } from './support/web-view';

// A 관정 login closed while its check still runs (P15 ticket 57, the review of #360): the check under way, or the
// landing kept while it ran, is followed by one last check, whose session takes effect though the view is closed; every
// check ends with the hidden view unmounted unless the flag is set; and "end the library session" logs out on the site
// once a login view was opened, whatever the flag says.

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
  return inCard(SEAT_TEST_ID);
}

function hiddenViewMounted(): boolean {
  return shownWebViews.some((shown) => shown.mounted && shown.props.testID === 'library-hidden-web-view');
}

// The login's checks: the first answers only on `release`, with no session; the later ones find the session when
// `later` is true, else none. Every other call is the fake library's.
function holdFirstCheck(later: boolean): { release: () => Promise<void>; checks: () => number } {
  const answer = fakeTransport(library).call;
  let release: (() => void) | null = null;
  let checks = 0;
  jest.spyOn(hiddenTransport, 'call').mockImplementation((endpoint, body) => {
    if (endpoint !== 'getMyBookingList') {
      return answer(endpoint, body);
    }
    checks += 1;
    if (checks === 1) {
      return new Promise<TransportReply>((resolve) => {
        release = (): void => {
          resolve({ ok: false, error: 'sessionEnded' });
        };
      });
    }
    return later ? answer(endpoint, body) : Promise.resolve({ ok: false, error: 'sessionEnded' });
  });
  return {
    release: async () => {
      release?.();
      await pass(0);
      await pass(0);
      await pass(0);
    },
    checks: () => checks,
  };
}

// 로그인 on the card, the main page the site serves first (its check held), then ✕ in the login's bar.
async function logInThenClose({ loggedInMeanwhile }: { loggedInMeanwhile: boolean }): Promise<void> {
  await pressIn(seatCard(), '로그인');
  await navigate(MAIN);
  if (loggedInMeanwhile) {
    await navigate('https://nsso.snu.ac.kr/sso/login');
    await navigate(MAIN);
  }
  await pressIn(screen, '닫기');
  await pass(0);
}

describe('a login closed while its check runs', () => {
  it('takes effect once the last check finds the session, though the view is closed', async () => {
    const held = holdFirstCheck(true);
    await askForCards({ server, library }, [SEAT_CARD], { loggedIn: false });

    await logInThenClose({ loggedInMeanwhile: true });
    expect(screen.queryByTestId('library-login-view')).toBeNull();
    expect(seatCard().getByText(NEEDS_LOGIN)).toBeVisible();
    await held.release();

    expect(held.checks()).toBe(2);
    await expect(isLibraryLoggedIn()).resolves.toBe(true);
    expect(seatCard().queryByText(NEEDS_LOGIN)).toBeNull();
    expect(seatCard().getByText('관정관 7층 7A 열람실 2 구역 · 7193번')).toBeVisible();
    expect(hiddenViewMounted()).toBe(true);
  });

  it('makes one last check when closed during the first, and with no session unmounts the hidden view', async () => {
    const held = holdFirstCheck(false);
    await askForCards({ server, library }, [SEAT_CARD], { loggedIn: false });

    await logInThenClose({ loggedInMeanwhile: false });
    await held.release();

    expect(held.checks()).toBe(2);
    await expect(isLibraryLoggedIn()).resolves.toBe(false);
    expect(hiddenViewMounted()).toBe(false);
    expect(seatCard().getByText(NEEDS_LOGIN)).toBeVisible();
  });
});

describe('the check kept while the view is in the school login', () => {
  it('waits while the view is off the site, and is made on close', async () => {
    const held = holdFirstCheck(true);
    await askForCards({ server, library }, [SEAT_CARD], { loggedIn: false });
    await pressIn(seatCard(), '로그인');
    await navigate(MAIN);
    await navigate(MAIN);
    await navigate('https://nsso.snu.ac.kr/sso/login');
    await held.release();

    // The first check found no session; the one kept does not reload the hidden page while the User is at the school.
    expect(held.checks()).toBe(1);
    expect(hiddenViewMounted()).toBe(false);

    await pressIn(screen, '닫기');
    await pass(0);
    await pass(0);

    expect(held.checks()).toBe(2);
    await expect(isLibraryLoggedIn()).resolves.toBe(true);
    expect(seatCard().getByText('관정관 7층 7A 열람실 2 구역 · 7193번')).toBeVisible();
  });
});

describe("the login's toast when the time runs out during a check", () => {
  it('says "로그인하지 못했어요" only once the last check found no session', async () => {
    const held = holdFirstCheck(false);
    await askForCards({ server, library }, [SEAT_CARD], { loggedIn: false });
    await pressIn(seatCard(), '로그인');
    await navigate(MAIN);

    await pass(LOGIN_LIMIT_MS);
    expect(screen.queryByTestId('library-login-view')).toBeNull();
    expect(screen.queryByText('로그인하지 못했어요')).toBeNull();

    await held.release();
    expect(held.checks()).toBe(2);
    expect(screen.getByText('로그인하지 못했어요')).toBeVisible();
  });
});

describe('the end of the library session after a login closed early', () => {
  it('logs out on the site though the flag was never set, in the hidden view mounted for it', async () => {
    const held = holdFirstCheck(false);
    await askForCards({ server, library }, [SEAT_CARD], { loggedIn: false });
    await logInThenClose({ loggedInMeanwhile: false });
    await held.release();
    expect(hiddenViewMounted()).toBe(false);

    let ended = false;
    await act(async () => {
      void endLibrarySession().then(() => {
        ended = true;
      });
      await Promise.resolve();
    });
    await pass(0);
    expect(webViewAt(LIBRARY_LOGOUT_URL)).toBeDefined();

    await loadHidden(LIBRARY_LOGOUT_URL);
    await pass(0);
    expect(ended).toBe(true);
    expect(hiddenViewMounted()).toBe(false);
  });
});
