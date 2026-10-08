import { fireEvent, screen } from '@testing-library/react';

import { SESSION_COOKIE } from '@/session';

import { browser } from './support/browser';
import { fakeMainServer } from './support/fake-main-server';
import { openAdministrators, signInAs } from './support/pages';

describe('a page without a session', () => {
  it('sends a person without the cookie to sign-in with the page path', async () => {
    fakeMainServer.hasAdministrators('kim@snu.ac.kr');

    await openAdministrators();

    expect(browser.location).toBe('/sign-in?next=%2Fadministrators');
    expect(fakeMainServer.requests).toEqual([]);
  });

  it('sends a person whose token the main server refuses to sign-in with the page path', async () => {
    fakeMainServer.hasAdministrators('kim@snu.ac.kr');
    browser.cookies.set(SESSION_COOKIE, 'access-token-that-ended');

    await openAdministrators();

    expect(browser.location).toBe('/sign-in?next=%2Fadministrators');
  });
});

describe('signing out', () => {
  it('ends the tokens on the main server, deletes the cookie and opens sign-in', async () => {
    fakeMainServer.hasAdministrators('kim@snu.ac.kr');
    signInAs('kim@snu.ac.kr');
    await openAdministrators();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await vi.waitFor(() => {
      expect(browser.location).toBe('/sign-in');
    });
    expect(fakeMainServer.requests).toContain('POST /admin/auth/sign-out');
    expect([...browser.cookies.keys()]).toEqual([]);
  });

  it('deletes the cookie also when the main server had already ended the token', async () => {
    fakeMainServer.hasAdministrators('kim@snu.ac.kr');
    const token = signInAs('kim@snu.ac.kr');
    await openAdministrators();
    await fakeMainServer.signOut(token);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await vi.waitFor(() => {
      expect(browser.location).toBe('/sign-in');
    });
    expect([...browser.cookies.keys()]).toEqual([]);
  });
});
