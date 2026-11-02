/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { act, screen } from '@testing-library/react-native';
import { clearWebViewCookies, pass, showRow, useLibrarySessionTests } from './support/library-session';
import { shownWebViews } from './support/web-view';
import { signOut } from '@/auth/sign-in';
import * as tokens from '@/auth/tokens';
import { endLibrarySession } from '@/library/end-session';
import { isLibraryLoggedIn, markLibraryLoggedIn } from '@/library/flag';
import { hiddenTransport } from '@/library/library';
import { keepRoomBooking } from '@/library/room-bookings';
import { endSession } from '@/session/session-events';
import * as kept from '@/storage/kept';
import AsyncStorage from '@react-native-async-storage/async-storage';

// "End the library session" from `signOut()` and `endSession()`, with the flag set and without it: it never holds
// up the sign-out, and the cookies and the flag are cleared whatever fails on the way.

useLibrarySessionTests();

// A logout of the site that never answers.
function unanswered(): Promise<boolean> {
  return new Promise<boolean>(() => {
    // Never answers.
  });
}

function quiet(): void {
  // The warning is only counted.
}

describe('the end of the library session from the sign-outs', () => {
  it('without the flag, loads nothing and only clears the cookies', async () => {
    const logout = jest.spyOn(hiddenTransport, 'logout');

    await endLibrarySession();

    expect(logout).not.toHaveBeenCalled();
    expect(shownWebViews).toEqual([]);
    expect(clearWebViewCookies).toHaveBeenCalledTimes(1);
    logout.mockRestore();
  });

  it('runs from signOut(), once the tokens are forgotten', async () => {
    await markLibraryLoggedIn();
    const logout = jest.spyOn(hiddenTransport, 'logout').mockResolvedValue(true);
    const keep = jest.spyOn(kept, 'keep');

    await signOut();
    await pass(0);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(keep).toHaveBeenCalled();
    expect(clearWebViewCookies).toHaveBeenCalledTimes(1);
    await expect(isLibraryLoggedIn()).resolves.toBe(false);
  });

  it("does not wait on the library's site in signOut()", async () => {
    await markLibraryLoggedIn();
    jest.spyOn(hiddenTransport, 'logout').mockReturnValue(unanswered());
    const keep = jest.spyOn(kept, 'keep');

    await signOut();

    expect(keep).toHaveBeenCalledWith({ signedIn: false, suggestion: null });
  });
});

describe('the end of the library session on the forced end', () => {
  it('runs from endSession(), the forced end, after the tokens are forgotten, with or without the flag', async () => {
    await markLibraryLoggedIn();
    const logout = jest.spyOn(hiddenTransport, 'logout').mockResolvedValue(true);

    const forget = jest.spyOn(tokens, 'forgetTokens');

    await endSession(true);
    await pass(0);
    await endSession(false);
    await pass(0);

    expect(forget.mock.invocationCallOrder[0]).toBeLessThan(clearWebViewCookies.mock.invocationCallOrder[0] ?? 0);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(clearWebViewCookies).toHaveBeenCalledTimes(2);
    await expect(isLibraryLoggedIn()).resolves.toBe(false);
  });

  it("forgets the tokens without waiting on a slow logout of the library's site", async () => {
    await markLibraryLoggedIn();
    const logoutAnswer: { resolve?: (loaded: boolean) => void } = {};
    jest.spyOn(hiddenTransport, 'logout').mockReturnValue(
      new Promise<boolean>((resolve) => {
        logoutAnswer.resolve = resolve;
      }),
    );
    const forget = jest.spyOn(tokens, 'forgetTokens');

    await endSession(false);

    expect(forget).toHaveBeenCalledTimes(1);
    expect(clearWebViewCookies).not.toHaveBeenCalled();

    logoutAnswer.resolve?.(false);
    await pass(0);
    expect(clearWebViewCookies).toHaveBeenCalledTimes(1);
    await expect(isLibraryLoggedIn()).resolves.toBe(false);
  });
});

describe('the end of the library session and what the phone kept', () => {
  it("removes the room bookings' map and their unsent reports, so the next person sees nothing of them", async () => {
    await keepRoomBooking(3000001, 'request-1');
    await AsyncStorage.setItem('snunow.room-results', JSON.stringify(['request-1']));

    await endLibrarySession();

    await expect(AsyncStorage.getItem('snunow.room-bookings')).resolves.toBeNull();
    await expect(AsyncStorage.getItem('snunow.room-results')).resolves.toBeNull();
  });
});

describe('the end of the library session when something fails', () => {
  it("forgets the tokens and clears the cookies and the flag when the site's logout fails", async () => {
    await markLibraryLoggedIn();
    jest.spyOn(hiddenTransport, 'logout').mockRejectedValue(new Error('offline'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(quiet);
    const forget = jest.spyOn(tokens, 'forgetTokens');

    await endSession(false);
    await pass(0);

    expect(forget).toHaveBeenCalledTimes(1);
    expect(clearWebViewCookies).toHaveBeenCalledTimes(1);
    await expect(isLibraryLoggedIn()).resolves.toBe(false);
    // Noted without the failure's content.
    expect(warn).toHaveBeenCalledWith('The library session did not end cleanly');
  });
  it('goes on to clear the flag when the cookies could not be cleared', async () => {
    await markLibraryLoggedIn();
    jest.spyOn(hiddenTransport, 'logout').mockResolvedValue(false);
    clearWebViewCookies.mockRejectedValueOnce(new Error('no jar'));

    await endLibrarySession();

    await expect(isLibraryLoggedIn()).resolves.toBe(false);
  });

  it("still clears the cookies and unmounts the hidden view when the phone's storage fails", async () => {
    await markLibraryLoggedIn();
    await showRow();
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('storage'));
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValue(new Error('storage'));

    await act(async () => {
      await expect(endLibrarySession()).rejects.toThrow('storage');
    });

    expect(clearWebViewCookies).toHaveBeenCalledTimes(1);
    expect(screen.getByText('로그인하지 않음')).toBeVisible();
    expect(shownWebViews.filter((shown) => shown.mounted)).toEqual([]);
  });
});
