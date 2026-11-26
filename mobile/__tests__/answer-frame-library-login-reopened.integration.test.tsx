/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { isLibraryLoggedIn } from '@/library/flag';
import { hiddenTransport } from '@/library/library';
import type { TransportReply } from '@/library/transport';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { type FakeLibrary, fakeTransport } from './support/kwanjeong/fake-library';
import { askForCards, inCard, pressIn, SEAT_CARD, startLibraryChat } from './support/library-chat';
import { navigate } from './support/library-session';

// A login opened again while the one closed before still waits on its checks (P15 ticket 58, the review of #360): the
// checks made for the closed view, finding no session, never close the view the User opened since.

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
const SCHOOL_LOGIN = 'https://nsso.snu.ac.kr/sso/login';

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

// Every login check waits for `answer`, which answers the oldest one waiting: with no session, or with the fake
// library's when `session` is true. Every other call is the fake library's.
function holdChecks(): { answer: (session: boolean) => Promise<void>; checks: () => number } {
  const call = fakeTransport(library).call;
  const waiting: ((session: boolean) => void)[] = [];
  let checks = 0;
  jest.spyOn(hiddenTransport, 'call').mockImplementation((endpoint, body) => {
    if (endpoint !== 'getMyBookingList') {
      return call(endpoint, body);
    }
    checks += 1;
    return new Promise<TransportReply>((resolve) => {
      waiting.push((session) => {
        if (session) {
          void call(endpoint, body).then(resolve);
        } else {
          resolve({ ok: false, error: 'sessionEnded' });
        }
      });
    });
  });
  return {
    answer: async (session) => {
      waiting.shift()?.(session);
      await pass(0);
      await pass(0);
      await pass(0);
    },
    checks: () => checks,
  };
}

describe('a login opened again while the closed one still waits on its checks', () => {
  it("stays open while the User is in the school's login, though the closed one's last check finds no session", async () => {
    const held = holdChecks();
    await askForCards({ server, library }, [SEAT_CARD], { loggedIn: false });

    // The first login: its check starts on the main page, and ✕ keeps one last check.
    await pressIn(seatCard(), '로그인');
    await navigate(MAIN);
    await pressIn(screen, '닫기');
    await pass(0);
    expect(screen.queryByTestId('library-login-view')).toBeNull();

    // 로그인 again; the first check ends with no session and the last one starts, then the User goes to the school.
    await pressIn(seatCard(), '로그인');
    expect(screen.getByTestId('library-login-view')).toBeVisible();
    await held.answer(false);
    expect(held.checks()).toBe(2);
    await navigate(SCHOOL_LOGIN);
    await held.answer(false);

    expect(screen.getByTestId('library-login-view')).toBeVisible();
    await expect(isLibraryLoggedIn()).resolves.toBe(false);

    // Back on the site logged in, the reopened view's own check takes effect.
    await navigate(MAIN);
    await held.answer(true);

    expect(screen.queryByTestId('library-login-view')).toBeNull();
    await expect(isLibraryLoggedIn()).resolves.toBe(true);
    expect(seatCard().getByText('7193번')).toBeVisible();
  });
});
