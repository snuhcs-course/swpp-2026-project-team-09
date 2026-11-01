/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { FakeLibrary, fakeTransport } from './kwanjeong/fake-library';
import { forgetWebViews } from './web-view';
import { ToastProvider } from '@/design-system';
import { hiddenTransport } from '@/library/library';
import { LibrarySessionProvider, useLibrarySession } from '@/library/library-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type ReactElement, useState } from 'react';
import { Pressable, Text } from 'react-native';

// What the library session's tests share: the cookie module's native side replaced, a row like the 내 정보 row, and
// the web views' events.

export const clearWebViewCookies = jest.fn((): Promise<void> => Promise.resolve());

function giveCookieModule(): void {
  const scope: { expo?: { modules?: Record<string, unknown> } } = globalThis;
  scope.expo ??= {};
  scope.expo.modules ??= {};
  scope.expo.modules.SnuNowWebCookies = { clearWebViewCookies };
}

// A row that opens the login or ends the session, as the 내 정보 row does, and says how the login ended.
export function Row(): ReactElement {
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

export async function pass(milliseconds: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
}

export async function showRow(row: ReactElement = <Row />): Promise<void> {
  await render(
    <ToastProvider>
      <LibrarySessionProvider>{row}</LibrarySessionProvider>
    </ToastProvider>,
  );
  await pass(0);
}

export async function navigate(url: string, loading = false): Promise<void> {
  await fireEvent(screen.getByTestId('library-login-view'), 'navigationStateChange', { url, loading });
}

// A page that loaded, as the web view tells it: `onLoad`, then `onLoadEnd`.
export async function loadHidden(url: string): Promise<void> {
  const view = screen.getByTestId('library-hidden-web-view');
  await fireEvent(view, 'load', { nativeEvent: { url, loading: false } });
  await fireEvent(view, 'loadEnd', { nativeEvent: { url, loading: false } });
}

// The library's calls answered by the fake library, as the hidden view would after the login.
export function answerFromFakeLibrary(library: FakeLibrary = new FakeLibrary()): FakeLibrary {
  jest.spyOn(hiddenTransport, 'call').mockImplementation(fakeTransport(library).call);
  return library;
}

// Each test starts on fake timers, with an empty phone storage, no web view and the cookie module in place.
export function useLibrarySessionTests(): void {
  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
    forgetWebViews();
    clearWebViewCookies.mockClear();
    giveCookieModule();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
}
