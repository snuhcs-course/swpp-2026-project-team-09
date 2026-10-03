import { Inject, Injectable, Scope } from '@nestjs/common';

// Injection token of the HTTP call under PageFetcher. The tests replace it with saved pages.
export const FETCH = 'FETCH';

// Names the project to whoever serves a Source.
const USER_AGENT = 'SNUNow/1.0 (SNU SWPP 2026 team 9; +https://github.com/snuhcs-course/swpp-2026-project-team-09)';

// A page not served by then is given up, so that it does not hold up the pages asked for after it.
const PAGE_TIMEOUT = 5000;

// The one place where pages are fetched. Each collector has one of its own, so that its pages wait for one another
// and not for another collector's.
@Injectable({ scope: Scope.TRANSIENT })
export class PageFetcher {
  private last: Promise<unknown> = Promise.resolve();

  constructor(@Inject(FETCH) private readonly fetchPage: typeof fetch) {}

  // One page at a time: a request waits for those the collector asked for before it. With a body, the page is asked
  // for by a POST of the body as JSON.
  fetch(url: string, body?: object): Promise<string> {
    const page = this.last.then(() => this.request(url, body));
    // A page that failed does not hold up the next one.
    this.last = page.catch(() => null);
    return page;
  }

  private async request(url: string, body?: object): Promise<string> {
    const init: RequestInit =
      body === undefined
        ? { headers: { 'User-Agent': USER_AGENT } }
        : {
            method: 'POST',
            headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(body),
          };
    const timeout = new AbortController();
    const timer = setTimeout(() => {
      timeout.abort(new Error(`${url} did not answer within ${PAGE_TIMEOUT / 1000} seconds`));
    }, PAGE_TIMEOUT);
    try {
      const response = await this.fetchPage(url, { ...init, signal: timeout.signal });
      if (!response.ok) {
        throw new Error(`${url} answered ${response.status}`);
      }
      return await response.text();
    } finally {
      clearTimeout(timer);
    }
  }
}
