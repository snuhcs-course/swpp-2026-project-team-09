/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { LOGIN_FIT_SCRIPT } from './login-fit';

// The login pages' alerts, said by the app in one line (P01 ticket 14). With a wrong password the library's login form
// comes back and raises the browser's own dialog, "SSO 응답 오류" with 확인. On the school's pages this script makes the
// page's `alert` send its words to the app instead. It reads nothing of the page: no field, no cookie, no storage;
// it only replaces `alert`. The site goes on after its alerts by itself, so none waits for a 확인. The web view runs it
// as the page starts and again when it has loaded, with the style sheet's script.
export const LOGIN_ALERT_SCRIPT = `(function () {
  if (!/(^|\\.)snu\\.ac\\.kr$/.test(location.hostname) || window.alert.snuNow === true) {
    return;
  }
  var said = function (words) {
    var app = window.ReactNativeWebView;
    if (app) {
      app.postMessage(JSON.stringify({ kind: 'alert', text: words === undefined ? '' : String(words) }));
    }
  };
  said.snuNow = true;
  window.alert = said;
})();
true;`;

// What the login view gives each page.
export const LOGIN_PAGE_SCRIPT = `${LOGIN_FIT_SCRIPT}\n${LOGIN_ALERT_SCRIPT}`;

// What the library's login form says to a wrong ID or password.
const LOGIN_FAILED = 'SSO 응답 오류';

export const WRONG_LOGIN_WORDS = '아이디나 비밀번호를 다시 확인해 주세요.';

const MOST_LETTERS = 200;

function isSchoolPage(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && (hostname === 'snu.ac.kr' || hostname.endsWith('.snu.ac.kr'));
  } catch {
    return false;
  }
}

function alertText(data: string): string | null {
  try {
    const message: unknown = JSON.parse(data);
    if (typeof message !== 'object' || message === null) {
      return null;
    }
    const { kind, text } = message as { kind?: unknown; text?: unknown };
    return kind === 'alert' && typeof text === 'string' ? text : null;
  } catch {
    return null;
  }
}

// The line the app says for a message of the page at `url`: the words for a wrong login, the site's own words on one
// line for any other alert, and none for anything else or from another site.
export function alertWords(data: string, url: string): string | null {
  if (!isSchoolPage(url)) {
    return null;
  }
  const text = alertText(data)?.replaceAll(/\s+/gu, ' ').trim().slice(0, MOST_LETTERS);
  if (text === undefined || text === '') {
    return null;
  }
  return text.includes(LOGIN_FAILED) ? WRONG_LOGIN_WORDS : text;
}
