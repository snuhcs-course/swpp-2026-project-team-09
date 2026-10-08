import { screen, within } from '@testing-library/react';

import { SESSION_COOKIE } from '@/session';

import { browser } from './support/browser';
import { fakeMainServer } from './support/fake-main-server';
import { fakeGoogle } from './support/google';
import { openAdministrators, openSignIn } from './support/pages';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'admin-client-id');
  fakeMainServer.hasAdministrators('kim@snu.ac.kr');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('signing in', () => {
  it('shows Google’s button in popup mode, without automatic sign-in', async () => {
    const google = fakeGoogle();

    await openSignIn('/sign-in');

    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
    expect(google.options()).toMatchObject({ client_id: 'admin-client-id', ux_mode: 'popup', auto_select: false });
  });

  it('returns to the page the person came from', async () => {
    const google = fakeGoogle();
    await openAdministrators();
    await openSignIn(browser.location ?? '');

    google.choose(fakeMainServer.idTokenOf('kim@snu.ac.kr'));

    await vi.waitFor(() => {
      expect(browser.location).toBe('/administrators');
    });
    await openAdministrators();
    expect(screen.getByRole('cell', { name: 'kim@snu.ac.kr' })).toBeVisible();
  });
  it.each(['https://elsewhere.example/administrators', '//elsewhere.example/administrators', 'administrators'])(
    'leads to the home page when asked to go to %s',
    async (next) => {
      const google = fakeGoogle();
      await openSignIn(`/sign-in?next=${encodeURIComponent(next)}`);

      google.choose(fakeMainServer.idTokenOf('kim@snu.ac.kr'));

      await vi.waitFor(() => {
        expect(browser.location).toBe('/');
      });
    },
  );
});

describe('a refused sign-in', () => {
  it('tells a person who is not a registered Administrator so, without a session', async () => {
    const google = fakeGoogle();
    await openSignIn('/sign-in?next=%2Fadministrators');

    google.choose(fakeMainServer.idTokenOf('park@gmail.com'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This Google account is not a registered Administrator.',
    );
    expect(browser.cookies.has(SESSION_COOKIE)).toBe(false);
    expect(browser.location).toBeUndefined();
  });

  it('says that signing in failed when the main server refuses the ID token', async () => {
    const google = fakeGoogle();
    await openSignIn('/sign-in?next=%2Fadministrators');

    google.choose('an-id-token-for-another-client');

    expect(await screen.findByRole('alert')).toHaveTextContent('Signing in failed. Try again.');
    expect(browser.cookies.has(SESSION_COOKIE)).toBe(false);
    expect(browser.location).toBeUndefined();
  });
});

describe('the menu after signing in', () => {
  it('shows the signed-in Administrator on every page', async () => {
    const google = fakeGoogle();
    await openSignIn('/sign-in?next=%2Fadministrators');

    google.choose(fakeMainServer.idTokenOf('kim@snu.ac.kr'));

    await vi.waitFor(() => {
      expect(browser.location).toBe('/administrators');
    });
    await openAdministrators();
    expect(within(screen.getByRole('complementary')).getByText('kim@snu.ac.kr')).toBeInTheDocument();
  });
});
