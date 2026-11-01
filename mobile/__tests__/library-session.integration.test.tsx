/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  answerFromFakeLibrary,
  clearWebViewCookies,
  loadHidden,
  navigate,
  pass,
  showRow,
  useLibrarySessionTests,
} from './support/library-session';
import { shownWebViews, webViewAt } from './support/web-view';
import { isLibraryLoggedIn, markLibraryLoggedIn } from '@/library/flag';
import { HiddenViewTransport, LOGOUT_MS, PAGE_LOAD_MS } from '@/library/hidden-transport';
import { HiddenLibraryView } from '@/library/hidden-view';
import { LOGIN_LIMIT_MS } from '@/library/login-view';
import { LIBRARY_LOGOUT_URL, LIBRARY_MAIN_URL } from '@/library/site';
import { LibraryCard } from '@/screens/me/library-card';

// The library session's login and its end from 내 정보, with the web views stood in for and the cookie module's native
// side replaced: the login's URL rule and its check, and the hidden view's page events.

useLibrarySessionTests();

describe('the login', () => {
  it("opens the library's page, injects nothing, and is done back on the booking screens once a read works", async () => {
    const library = answerFromFakeLibrary();
    await showRow();
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
    await pass(0);

    const login = webViewAt(LIBRARY_MAIN_URL);
    expect(login?.props.testID).toBe('library-login-view');
    expect(login?.props.injectedJavaScript).toBeUndefined();
    expect(login?.props.injectedJavaScriptBeforeContentLoaded).toBeUndefined();
    expect(login?.props.incognito).toBe(false);

    await navigate('https://nsso.snu.ac.kr/sso/login');
    await navigate('https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main', true);
    await pass(0);
    expect(screen.queryByText('loggedIn')).toBeNull();

    await navigate('https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main');
    await pass(0);

    expect(library.requestsTo('getMyBookingList')).toHaveLength(1);
    expect(screen.getByText('loggedIn')).toBeVisible();
    await expect(isLibraryLoggedIn()).resolves.toBe(true);
    // The hidden view is mounted at the root while the flag is set, on the site's main page.
    expect(shownWebViews.some((shown) => shown.mounted && shown.props.testID === 'library-hidden-web-view')).toBe(true);
  });
});

describe("the login's check", () => {
  it('stays open when the main page comes but the read does not work, and is done once it does', async () => {
    const library = answerFromFakeLibrary();
    library.answerNext('sessionEnded');
    await showRow();
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
    await pass(0);

    // The page the login starts from, served before the site sends the User to the school's login.
    await navigate(LIBRARY_MAIN_URL);
    await pass(0);

    expect(library.requestsTo('getMyBookingList')).toHaveLength(1);
    expect(screen.queryByText('loggedIn')).toBeNull();
    expect(screen.getByTestId('library-login-view')).toBeVisible();
    await expect(isLibraryLoggedIn()).resolves.toBe(false);
    expect(shownWebViews.some((shown) => shown.mounted && shown.props.testID === 'library-hidden-web-view')).toBe(
      false,
    );

    await navigate('https://nsso.snu.ac.kr/sso/login');
    await navigate('https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main');
    await pass(0);

    expect(library.requestsTo('getMyBookingList')).toHaveLength(2);
    expect(screen.getByText('loggedIn')).toBeVisible();
    await expect(isLibraryLoggedIn()).resolves.toBe(true);
  });
});

describe('the login, left without a session', () => {
  it('gives "no session" when the User closes it', async () => {
    await showRow();
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
    await pass(0);

    await fireEvent.press(screen.getByRole('button', { name: '닫기' }));
    await pass(0);

    expect(screen.getByText('noSession')).toBeVisible();
    await expect(isLibraryLoggedIn()).resolves.toBe(false);
  });

  it('closes after five minutes with "로그인하지 못했어요"', async () => {
    await showRow();
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
    await pass(LOGIN_LIMIT_MS);

    expect(screen.getByText('failed')).toBeVisible();
    expect(screen.getByText('로그인하지 못했어요')).toBeVisible();
  });
});

describe("the hidden view's page", () => {
  it('stays failed when the load fails, as the web view tells it with onError and then onLoadEnd, and loads again', async () => {
    const transport = new HiddenViewTransport();
    await render(<HiddenLibraryView transport={transport} />);
    const failed = { url: LIBRARY_MAIN_URL, loading: false, code: -2, description: 'net::ERR_INTERNET_DISCONNECTED' };
    const first = screen.getByTestId('library-hidden-web-view');
    await fireEvent(first, 'error', { nativeEvent: failed });
    await fireEvent(first, 'loadEnd', { nativeEvent: failed });
    const before = shownWebViews.length;

    let reply: unknown = null;
    void transport.call('getMyBookingList', {}).then((answer) => {
      reply = answer;
    });
    await pass(0);

    // Not taken as ready: nothing is injected into the error page, and the page is loaded again.
    expect(shownWebViews.flatMap((shown) => shown.injected)).toEqual([]);
    expect(shownWebViews).toHaveLength(before + 1);
    expect(reply).toBeNull();

    await pass(PAGE_LOAD_MS);
    expect(reply).toEqual({ ok: false, error: 'network' });
  });
});

describe('the end of the library session', () => {
  it('loads the logout URL in the hidden view, clears the cookies and then the flag, from 내 정보', async () => {
    await markLibraryLoggedIn();
    await showRow(<LibraryCard />);
    expect(screen.getByText('관정도서관 로그인')).toBeVisible();
    await loadHidden(LIBRARY_MAIN_URL);

    await fireEvent.press(screen.getByRole('button', { name: '로그아웃' }));
    await pass(0);
    expect(webViewAt(LIBRARY_LOGOUT_URL)).toBeDefined();
    expect(clearWebViewCookies).not.toHaveBeenCalled();

    await loadHidden(LIBRARY_LOGOUT_URL);
    await pass(0);

    expect(clearWebViewCookies).toHaveBeenCalledTimes(1);
    await expect(isLibraryLoggedIn()).resolves.toBe(false);
    expect(screen.getByRole('button', { name: '로그인' })).toBeVisible();
    expect(shownWebViews.filter((shown) => shown.mounted)).toEqual([]);
  });

  it('goes on to the cookies when the logout page does not answer in 15 seconds', async () => {
    await markLibraryLoggedIn();
    await showRow();
    await fireEvent.press(screen.getByRole('button', { name: '로그아웃' }));

    await pass(LOGOUT_MS);

    expect(clearWebViewCookies).toHaveBeenCalledTimes(1);
    await expect(isLibraryLoggedIn()).resolves.toBe(false);
  });
});
