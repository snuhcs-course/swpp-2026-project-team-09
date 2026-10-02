import { Inject, Injectable } from '@nestjs/common';

// Injection token of the HTTP call under PageFetcher. The tests replace it with saved pages.
export const FETCH = 'FETCH';

// Names the project to whoever serves a Source.
const USER_AGENT = 'SNUNow/1.0 (SNU SWPP 2026 team 9; +https://github.com/snuhcs-course/swpp-2026-project-team-09)';

// The one place where pages are fetched.
@Injectable()
export class PageFetcher {
  private last: Promise<unknown> = Promise.resolve();

  constructor(@Inject(FETCH) private readonly fetchPage: typeof fetch) {}

  // One page at a time: a request waits for those asked for before it, whoever asked.
  fetch(url: string): Promise<string> {
    const page = this.last.then(() => this.get(url));
    // A page that failed does not hold up the next one.
    this.last = page.catch(() => null);
    return page;
  }

  private async get(url: string): Promise<string> {
    const response = await this.fetchPage(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) {
      throw new Error(`${url} answered ${response.status}`);
    }
    return response.text();
  }
}
