/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { LOGIN_PAGE_SCRIPT } from '@/library/login-alert';
import { LOGIN_FIT_CSS, LOGIN_FIT_ID, LOGIN_FIT_SCRIPT } from '@/library/login-fit';
import { LibraryLogin } from '@/library/login-view';
import { LIBRARY_MAIN_URL } from '@/library/site';
import { forgetWebViews, webViewAt } from './support/web-view';

// The library's login form is laid out for a desktop. The login view gives its pages one script, which adds a style
// sheet that fits the form to the phone's width on the login pages only, and nothing else (P01 ticket 02).

interface Added {
  id: string;
  textContent: string;
}

// The script run against a stand-in page at `url`, with or without its head parsed yet.
function runOn(url: string, headParsed = true): { added: Added[]; loaded: () => void } {
  const added: Added[] = [];
  const listeners: (() => void)[] = [];
  const parent = {
    appendChild: (element: Added): void => {
      added.push(element);
    },
  };
  const { hostname, pathname } = new URL(url);
  const document = {
    documentElement: parent,
    head: headParsed ? parent : null,
    getElementById: (id: string): Added | null => added.find((element) => element.id === id) ?? null,
    createElement: (): Added => ({ id: '', textContent: '' }),
    addEventListener: (_event: string, listener: () => void): void => {
      listeners.push(listener);
    },
  };
  // The script as the web view runs it, with the page's `location` and `document` in reach.
  // oxlint-disable-next-line typescript/no-implied-eval, typescript/no-unsafe-type-assertion -- the injected text itself
  const script = new Function('location', 'document', LOGIN_FIT_SCRIPT) as (
    location: unknown,
    document: unknown,
  ) => void;
  script({ hostname, pathname }, document);
  return {
    added,
    loaded: () => {
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

const noop = (): void => undefined;

const FORM = 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/login/form';

describe('the login form’s fit', () => {
  it('adds the style sheet to the login form once, before and after the page has loaded', () => {
    const page = runOn(FORM);
    page.loaded();

    expect(page.added).toEqual([{ id: LOGIN_FIT_ID, textContent: LOGIN_FIT_CSS }]);
  });

  it('adds it before the head is parsed too', () => {
    expect(runOn(FORM, false).added).toHaveLength(1);
  });

  it('leaves the site’s other pages and other sites alone', () => {
    expect(runOn('https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main').added).toEqual([]);
    expect(runOn('https://example.com/NEW_SNU_BOOKING/pc/login/form').added).toEqual([]);
  });

  it('lifts the desktop width and lays the form out in one column', () => {
    expect(LOGIN_FIT_CSS).toContain('html,body{min-width:0!important');
    expect(LOGIN_FIT_CSS).toContain('.login_wrap{position:static!important;width:auto!important');
    expect(LOGIN_FIT_CSS).toContain('.login_wrap dd input{width:100%!important');
  });
});

describe('the login view', () => {
  afterEach(() => {
    forgetWebViews();
  });

  it('gives its pages the fit and the alerts’ script, and takes a message only for an alert (ticket 14)', async () => {
    await render(<LibraryLogin checking={false} onDone={noop} onLanded={noop} onLeft={noop} visible />);

    const web = webViewAt(LIBRARY_MAIN_URL);
    expect(web?.props.testID).toBe('library-login-view');
    expect(web?.props.injectedJavaScriptBeforeContentLoaded).toBe(LOGIN_PAGE_SCRIPT);
    expect(web?.props.injectedJavaScript).toBe(LOGIN_PAGE_SCRIPT);
    expect(web?.props.onMessage).toEqual(expect.any(Function));
    expect(web?.injected).toEqual([]);
    expect(screen.getByText('아이디와 비밀번호는 도서관 로그인 페이지로만 전달돼요')).toBeVisible();
  });
});
