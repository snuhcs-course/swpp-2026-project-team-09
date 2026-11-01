/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type * as WebViewStub from './support/web-view';
import { forgetWebViews, shownWebViews, webViewAt } from './support/web-view';
import { signOut } from '@/auth/sign-in';
import * as tokens from '@/auth/tokens';
import { ToastProvider } from '@/design-system';
import { endLibrarySession } from '@/library/end-session';
import { isLibraryLoggedIn, markLibraryLoggedIn } from '@/library/flag';
import { LOGOUT_MS } from '@/library/hidden-transport';
import { hiddenTransport } from '@/library/library';
import { LibrarySessionProvider, useLibrarySession } from '@/library/library-session';
import { LOGIN_LIMIT_MS } from '@/library/login-view';
import { LIBRARY_LOGOUT_URL, LIBRARY_MAIN_URL } from '@/library/site';
import { LibraryCard } from '@/screens/me/library-card';
import { endSession } from '@/session/session-events';
import * as kept from '@/storage/kept';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type ReactElement, useState } from 'react';
import { Pressable, Text } from 'react-native';

// The library session's login and its end, with the web views stood in for and the cookie module's native side
// replaced: the login's URL rule, and "end the library session" from the provider's logout, `signOut()` and
// `endSession()`, with the flag set and without it.

jest.mock('react-native-webview', () => jest.requireActual<typeof WebViewStub>('./support/web-view').webViewModule);

const clearWebViewCookies = jest.fn((): Promise<void> => Promise.resolve());

function giveCookieModule(): void {
  const scope: { expo?: { modules?: Record<string, unknown> } } = globalThis;
  scope.expo ??= {};
  scope.expo.modules ??= {};
  scope.expo.modules.SnuNowWebCookies = { clearWebViewCookies };
}

// A row that opens the login or ends the session, as the 내 정보 row does, and says how the login ended.
function Row(): ReactElement {
  const { loggedIn, logIn, logOut } = useLibrarySession();
  const [outcome, setOutcome] = useState('');
  return (
    <>
      <Text>{loggedIn ? '로그인됨' : '로그인하지 않음'}</Text>
      <Text>{outcome}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void (loggedIn ? logOut() : logIn().then(setOutcome));
        }}
      >
        <Text>{loggedIn ? '로그아웃' : '로그인'}</Text>
      </Pressable>
    </>
  );
}

async function pass(milliseconds: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
}

async function showRow(row: ReactElement = <Row />): Promise<void> {
  await render(
    <ToastProvider>
      <LibrarySessionProvider>{row}</LibrarySessionProvider>
    </ToastProvider>,
  );
  await pass(0);
}

async function navigate(url: string, loading = false): Promise<void> {
  await fireEvent(screen.getByTestId('library-login-view'), 'navigationStateChange', { url, loading });
}

async function loadHidden(url: string): Promise<void> {
  await fireEvent(screen.getByTestId('library-hidden-web-view'), 'loadEnd', { nativeEvent: { url, loading: false } });
}

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
  forgetWebViews();
  clearWebViewCookies.mockClear();
  giveCookieModule();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the login', () => {
  it("opens the library's page, injects nothing, and is done back on the booking screens", async () => {
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

    expect(screen.getByText('loggedIn')).toBeVisible();
    await expect(isLibraryLoggedIn()).resolves.toBe(true);
    // The hidden view is mounted at the root while the flag is set, on the site's main page.
    expect(shownWebViews.some((shown) => shown.mounted && shown.props.testID === 'library-hidden-web-view')).toBe(true);
  });

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

describe('the end of the library session from the sign-outs', () => {
  it('without the flag, loads nothing and only clears the cookies', async () => {
    const logout = jest.spyOn(hiddenTransport, 'logout');

    await endLibrarySession();

    expect(logout).not.toHaveBeenCalled();
    expect(shownWebViews).toEqual([]);
    expect(clearWebViewCookies).toHaveBeenCalledTimes(1);
    logout.mockRestore();
  });

  it('runs from signOut(), before the tokens are forgotten', async () => {
    await markLibraryLoggedIn();
    const logout = jest.spyOn(hiddenTransport, 'logout').mockResolvedValue(true);
    const keep = jest.spyOn(kept, 'keep');

    await signOut();

    expect(logout).toHaveBeenCalledTimes(1);
    expect(clearWebViewCookies.mock.invocationCallOrder[0]).toBeLessThan(keep.mock.invocationCallOrder[0] ?? 0);
    expect(clearWebViewCookies).toHaveBeenCalledTimes(1);
    await expect(isLibraryLoggedIn()).resolves.toBe(false);
    jest.restoreAllMocks();
  });
});

describe('the end of the library session on the forced end', () => {
  it('runs from endSession(), the forced end, with or without the flag', async () => {
    await markLibraryLoggedIn();
    const logout = jest.spyOn(hiddenTransport, 'logout').mockResolvedValue(true);

    const forget = jest.spyOn(tokens, 'forgetTokens');

    await endSession(true);
    await endSession(false);

    expect(clearWebViewCookies.mock.invocationCallOrder[0]).toBeLessThan(forget.mock.invocationCallOrder[0] ?? 0);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(clearWebViewCookies).toHaveBeenCalledTimes(2);
    await expect(isLibraryLoggedIn()).resolves.toBe(false);
    jest.restoreAllMocks();
  });

  it('goes on to clear the flag when the cookies could not be cleared', async () => {
    await markLibraryLoggedIn();
    jest.spyOn(hiddenTransport, 'logout').mockResolvedValue(false);
    clearWebViewCookies.mockRejectedValueOnce(new Error('no jar'));

    await endLibrarySession();

    await expect(isLibraryLoggedIn()).resolves.toBe(false);
    jest.restoreAllMocks();
  });
});
