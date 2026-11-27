/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { alertWords, LOGIN_ALERT_SCRIPT, LOGIN_PAGE_SCRIPT, WRONG_LOGIN_WORDS } from '@/library/login-alert';
import { LOGIN_FIT_SCRIPT } from '@/library/login-fit';

// The login page's alerts as one line of the app (P01 ticket 16). With a wrong password the library's login form
// raises the browser's own dialog, "SSO 응답 오류" with 확인. The login view's page script turns the page's `alert` into a
// message to the app, and reads nothing of the page.

interface Page {
  alert: (words?: unknown) => void;
  ReactNativeWebView: { postMessage: (data: string) => void };
}

function pageAt(hostname: string): { page: Page; posted: string[]; dialog: unknown[]; run: () => void } {
  const posted: string[] = [];
  const dialog: unknown[] = [];
  const page: Page = {
    alert: (words) => {
      dialog.push(words);
    },
    ReactNativeWebView: {
      postMessage: (data: string) => {
        posted.push(data);
      },
    },
  };
  // The script as the web view runs it, with the page's `window` and `location` in reach.
  // oxlint-disable-next-line typescript/no-implied-eval, typescript/no-unsafe-type-assertion -- the injected text itself
  const script = new Function('window', 'location', LOGIN_ALERT_SCRIPT) as (window: Page, place: object) => void;
  return {
    page,
    posted,
    dialog,
    run: () => {
      script(page, { hostname });
    },
  };
}

const LIBRARY = 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/login/login';

// Partitions: the words a script that reads the page would name. Expected values: the ticket (no input
// field, no form, no cookie, no storage).
describe('The login page’s alert script', () => {
  it.each(['input', 'form', 'cookie', 'storage', 'value', 'document', 'password', 'field', 'query'])(
    'names no %s',
    (word) => {
      expect(LOGIN_ALERT_SCRIPT.toLowerCase()).not.toContain(word);
    },
  );

  it('runs after the style sheet’s script, in the same place', () => {
    expect(LOGIN_PAGE_SCRIPT).toBe(`${LOGIN_FIT_SCRIPT}\n${LOGIN_ALERT_SCRIPT}`);
  });
});

// Partitions: a page of the school, another site, and a second run on the same page. Expected values: the ticket.
describe('The login page’s alert, in the page', () => {
  it('goes to the app as a message on a page of the school, with no dialog', () => {
    const { page, posted, dialog, run } = pageAt('k-rsv.snu.ac.kr');
    run();

    page.alert('SSO 응답 오류');

    expect(dialog).toEqual([]);
    expect(posted.map((data) => JSON.parse(data) as unknown)).toEqual([{ kind: 'alert', text: 'SSO 응답 오류' }]);
  });

  it('is sent once when the script runs twice, before and after the page loads', () => {
    const { page, posted, run } = pageAt('nsso.snu.ac.kr');
    run();
    run();

    page.alert('로그인 정보가 없습니다.');

    expect(posted).toHaveLength(1);
  });

  it('is left as the browser’s own on another site', () => {
    const { page, posted, dialog, run } = pageAt('example.com');
    run();

    page.alert('hello');

    expect(dialog).toEqual(['hello']);
    expect(posted).toEqual([]);
  });
});

const alert = (text: unknown): string => JSON.stringify({ kind: 'alert', text });

// Partitions: the login failure, another alert, more than one line, and messages the app does not take. Expected
// values: the ticket.
describe('The words of a login page’s alert', () => {
  it('are "아이디나 비밀번호를 다시 확인해 주세요." for the login failure', () => {
    expect(alertWords(alert('SSO 응답 오류'), LIBRARY)).toBe(WRONG_LOGIN_WORDS);
    expect(WRONG_LOGIN_WORDS).toBe('아이디나 비밀번호를 다시 확인해 주세요.');
  });

  it('are the site’s own for any other alert, on one line', () => {
    expect(alertWords(alert('로그인 정보가 없습니다.\n로그인 화면으로 이동합니다.'), LIBRARY)).toBe(
      '로그인 정보가 없습니다. 로그인 화면으로 이동합니다.',
    );
  });

  it.each([
    ['a page of another site', alert('SSO 응답 오류'), 'https://example.com/login'],
    ['a page of the school over http', alert('SSO 응답 오류'), 'http://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main'],
    ['a message that is not JSON', 'SSO 응답 오류', LIBRARY],
    ['another kind of message', JSON.stringify({ kind: 'call', text: 'SSO 응답 오류' }), LIBRARY],
    ['an alert whose text is not words', alert(3), LIBRARY],
    ['an empty alert', alert('  '), LIBRARY],
  ])('are none for %s', (_case, data, url) => {
    expect(alertWords(data, url)).toBeNull();
  });
});
