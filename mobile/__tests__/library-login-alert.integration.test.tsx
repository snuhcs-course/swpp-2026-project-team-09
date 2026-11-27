/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, screen, within } from '@testing-library/react-native';
import { color, radius } from '@/design-system';
import { isLibraryLoggedIn } from '@/library/flag';
import { LIBRARY_MAIN_URL } from '@/library/site';
import { answerFromFakeLibrary, navigate, pass, showRow, useLibrarySessionTests } from './support/library-session';

// The login page's alerts as one line of the app (P01 ticket 16). With a wrong password the library's login form came
// back with the browser's own dialog, "'https://k-rsv.snu.ac.kr' 페이지 내용: SSO 응답 오류" and 확인. The page's alert now
// reaches the app as a message, and the app says it in one line under the notice. The navigation events are the ones
// a login gives (`library-session.integration.test.tsx`); the alert is the message the page script sends
// (`library-login-alert.unit.test.ts`).

useLibrarySessionTests();

const FORM = 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/login/form';
const SENT = 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/login/login';
const SCHOOL_LOGIN = 'https://nsso.snu.ac.kr/sso/login';
const BACK = 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main';
const WRONG = '아이디나 비밀번호를 다시 확인해 주세요.';
const COVER = '로그인하는 중이에요';

async function openForm(): Promise<void> {
  await showRow();
  await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
  await pass(0);
  await navigate(LIBRARY_MAIN_URL, true);
  await navigate(FORM);
}

async function alerted(text: string, url = SENT): Promise<void> {
  await fireEvent(screen.getByTestId('library-login-view'), 'message', {
    nativeEvent: { data: JSON.stringify({ kind: 'alert', text }), url },
  });
}

// The form sent, and the page that comes back.
async function sent(back = SENT): Promise<void> {
  await navigate(SENT, true);
  await navigate(back, back !== SENT);
}

const said = (): ReturnType<typeof screen.queryByTestId> => screen.queryByTestId('library-login-said');

// Partitions: a wrong password, then the right one; the line's look and place. Expected values: the tickets (16, 34).
describe('A wrong password at the library’s login', () => {
  it('says to check the ID and password in one line, which goes at a touch, and the right one then logs in', async () => {
    answerFromFakeLibrary();
    await openForm();

    await sent();
    await navigate(FORM);
    await alerted('SSO 응답 오류', FORM);
    expect(screen.getByText(WRONG)).toBeVisible();
    expect(screen.queryByText('SSO 응답 오류')).toBeNull();

    await fireEvent(screen.getByTestId('library-login-page'), 'touchStart');
    expect(said()).toBeNull();

    await sent(BACK);
    await navigate(BACK);
    await pass(0);
    expect(screen.getByText('loggedIn')).toBeVisible();
    await expect(isLibraryLoggedIn()).resolves.toBe(true);
  });

  // P01 ticket 34 (the #641 follow-up): the line stood over the library's page, on its logo, in a pill.
  it("stands in the app's own row under the notice, over the page and never on it, in red words with no pill", async () => {
    answerFromFakeLibrary();
    await openForm();
    await alerted('SSO 응답 오류', FORM);

    const line = screen.getByText(WRONG);
    expect(line).toHaveStyle({ color: color.danger });
    expect(line).not.toHaveStyle({ backgroundColor: 'rgba(196, 43, 43, 0.88)' });
    expect(line).not.toHaveStyle({ borderRadius: radius.full });
    expect(within(screen.getByTestId('library-login-page')).queryByText(WRONG)).toBeNull();
    expect(within(screen.getByTestId('library-login-said-row')).getByText(WRONG)).toBeVisible();
    expect(within(screen.getByTestId('library-login-page')).queryAllByRole('button')).toHaveLength(0);
  });

  it('keeps its row before the line comes, so that the page does not move when it does', async () => {
    answerFromFakeLibrary();
    await openForm();

    const row = screen.getByTestId('library-login-said-row', { includeHiddenElements: true });
    expect(within(row).queryByText(WRONG)).toBeNull();
    expect(within(row).getByText(WRONG, { includeHiddenElements: true })).toBeOnTheScreen();

    await alerted('SSO 응답 오류', FORM);

    expect(screen.getByTestId('library-login-said-row')).toBe(row);
    expect(within(row).getByText(WRONG)).toBeVisible();
  });
});

// Partitions: an alert during a way back, and the site going on after it. Expected values: the ticket.
describe('A login page’s alert during a way back', () => {
  it('lifts the cover of the way back, and says it', async () => {
    answerFromFakeLibrary();
    await showRow();
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
    await pass(0);
    await navigate(SCHOOL_LOGIN);
    await navigate(BACK, true);
    expect(screen.getByText(COVER)).toBeVisible();

    await alerted('SSO 응답 오류', BACK);

    expect(screen.queryByText(COVER)).toBeNull();
    expect(screen.getByText(WRONG)).toBeVisible();
  });

  it('stays said when the site goes on to its login form after it', async () => {
    answerFromFakeLibrary();
    await showRow();
    await fireEvent.press(screen.getByRole('button', { name: '로그인' }));
    await pass(0);
    await navigate(SCHOOL_LOGIN);
    await navigate(BACK, true);

    await alerted('로그인 정보가 없습니다. 로그인 화면으로 이동합니다.', BACK);
    await navigate(FORM, true);
    await navigate(FORM);

    expect(screen.getByText('로그인 정보가 없습니다. 로그인 화면으로 이동합니다.')).toBeVisible();
  });
});

// Partitions: another alert's words, and messages the app does not take. Expected values: the ticket.
describe('A login page’s alert that is not the login failure', () => {
  it('is said in the site’s own words, on one line', async () => {
    answerFromFakeLibrary();
    await openForm();

    await alerted('로그인 정보가 없습니다.\n로그인 화면으로 이동합니다.', FORM);

    expect(screen.getByText('로그인 정보가 없습니다. 로그인 화면으로 이동합니다.')).toBeVisible();
  });

  it('is not said when it comes from another site, or is no alert', async () => {
    answerFromFakeLibrary();
    await openForm();

    await alerted('SSO 응답 오류', 'https://example.com/');
    await fireEvent(screen.getByTestId('library-login-view'), 'message', {
      nativeEvent: { data: 'SSO 응답 오류', url: FORM },
    });

    expect(said()).toBeNull();
  });
});
