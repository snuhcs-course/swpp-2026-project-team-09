/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Browser, type LaunchBrowser, type OpenedPage } from '../src/common/browser-pages.js';

export interface BrowserStub {
  // Give it to startApp in place of the real browser.
  launch: LaunchBrowser;
  // Each page opened, in order, with the clock's time when it was asked for.
  opened: { url: string; at: number }[];
  launches: number;
  closes: number;
}

// Where a page is served as another address, as after a redirect.
export interface Redirected {
  redirectedTo: string;
  html?: string;
}

// Stands for the browser: opens the address of each page on the page, past the redirect given in its place, and fails on
// any other address, as `goto` fails on a page that does not answer.
export function browserServing(pages: Record<string, string | Redirected>): BrowserStub {
  const stub: BrowserStub = {
    opened: [],
    launches: 0,
    closes: 0,
    launch: () => {
      stub.launches += 1;
      const browser: Browser = {
        open: (url): Promise<OpenedPage> => {
          stub.opened.push({ url, at: Date.now() });
          const page = pages[url];
          if (page === undefined) {
            return Promise.reject(new Error(`${url} did not answer`));
          }
          return Promise.resolve(
            typeof page === 'string'
              ? { url, html: page }
              : { url: page.redirectedTo, html: page.html ?? '<html></html>' },
          );
        },
        close: () => {
          stub.closes += 1;
          return Promise.resolve();
        },
      };
      return Promise.resolve(browser);
    },
  };
  return stub;
}
