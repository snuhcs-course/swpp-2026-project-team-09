/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, screen, within } from '@testing-library/react-native';
import { radius } from '@/design-system';
import { isLibraryLoggedIn } from '@/library/flag';
import { LIBRARY_MAIN_URL } from '@/library/site';
import { answerFromFakeLibrary, navigate, pass, showRow, useLibrarySessionTests } from './support/library-session';
import { shownWebViews } from './support/web-view';

// The login's cover (P01 ticket 13). On the user's phone the library site's own page showed for a moment after a login,
// and then went: the view closed only once the site's main page had loaded and the check of the session had ended. From
// the moment the view comes back from the school's login to the site's screens, a cover says "로그인하는 중이에요" over
// the page, until the check ends: the view closes with a session, or the cover goes and the view stays without one.
// The navigation events are the ones a login gives (`library-session.integration.test.tsx`). Nothing of the session
// leaves the web views (ADR 0012): the cover is a view of the app over the web view.

useLibrarySessionTests();

const SCHOOL_LOGIN = 'https://nsso.snu.ac.kr/sso/login';
const BACK = 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main';
const COVER = '로그인하는 중이에요';

async function openLogin(): Promise<void> {
  await showRow();
  await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
  await pass(0);
}

// Partitions: the page the login starts from, and the way back from the school's login with a session. Expected
// values: the ticket.
describe("The login's cover", () => {
  it('is not over the page the login starts from, nor the school’s login', async () => {
    answerFromFakeLibrary();
    await openLogin();

    await navigate(LIBRARY_MAIN_URL, true);
    expect(screen.queryByText(COVER)).toBeNull();
    await navigate(SCHOOL_LOGIN, true);
    await navigate(SCHOOL_LOGIN);
    expect(screen.queryByText(COVER)).toBeNull();
  });

  it('covers the page from the moment the view comes back from the school’s login, until the view closes', async () => {
    answerFromFakeLibrary();
    await openLogin();
    await navigate(SCHOOL_LOGIN);

    // Before the site's page has loaded. The fake library answers the check at once, so the view closes as the page
    // lands.
    await navigate(BACK, true);
    expect(screen.getByText(COVER)).toBeVisible();
    await navigate(BACK);

    await pass(0);
    expect(screen.getByText('loggedIn')).toBeVisible();
    await expect(isLibraryLoggedIn()).resolves.toBe(true);
  });
});

// Partitions: a way back that stalls before the page lands, and the cover's look. Expected values: the ticket (at most
// 15 seconds, and the hint's look: one line in a see-through pill, no button).
describe("The login's cover's limit and look", () => {
  it('comes off 15 seconds after the way back began when the page never lands, and the view stays open', async () => {
    answerFromFakeLibrary();
    await openLogin();
    await navigate(SCHOOL_LOGIN);

    await navigate(BACK, true);
    await pass(15_000 - 1);
    expect(screen.getByText(COVER)).toBeVisible();
    await pass(1);

    expect(screen.queryByText(COVER)).toBeNull();
    expect(screen.getByTestId('library-login-view')).toBeVisible();
  });

  it('is one line in a see-through pill, with no button', async () => {
    answerFromFakeLibrary();
    await openLogin();
    await navigate(SCHOOL_LOGIN);
    await navigate(BACK, true);

    const words = screen.getByText(COVER);
    expect(words).toHaveProp('numberOfLines', 1);
    expect(words).toHaveStyle({ backgroundColor: 'rgba(14, 19, 48, 0.62)', borderRadius: radius.full });
    expect(within(screen.getByTestId('library-login-cover')).queryAllByRole('button')).toHaveLength(0);
  });
});

// Partitions: a check still under way, and one that finds no session. Expected values: the ticket.
describe("The login's cover during the check", () => {
  it('stays over the landed page while the check is still under way', async () => {
    const library = answerFromFakeLibrary();
    library.holdBookingReads();
    await openLogin();
    await navigate(SCHOOL_LOGIN);

    await navigate(BACK, true);
    await navigate(BACK);
    await pass(0);
    // The check is under way: the hidden view is mounted for its read, which the library holds.
    expect(shownWebViews.some((shown) => shown.mounted && shown.props.testID === 'library-hidden-web-view')).toBe(true);
    expect(screen.getByText(COVER)).toBeVisible();

    library.release();
    await pass(0);
    expect(screen.getByText('loggedIn')).toBeVisible();
  });

  it('goes when the check finds no session, and the view stays open', async () => {
    const library = answerFromFakeLibrary();
    library.answerNext('sessionEnded');
    await openLogin();
    await navigate(SCHOOL_LOGIN);

    await navigate(BACK, true);
    expect(screen.getByText(COVER)).toBeVisible();
    await navigate(BACK);
    await pass(0);

    expect(screen.queryByText(COVER)).toBeNull();
    expect(screen.getByTestId('library-login-view')).toBeVisible();
  });
});
