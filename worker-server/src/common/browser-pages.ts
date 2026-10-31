/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';

// Injection token of the browser under BrowserPages. The tests replace it with saved pages.
export const LAUNCH_BROWSER = 'LAUNCH_BROWSER';

// A page as the browser ended up on it, past any redirect.
export interface OpenedPage {
  url: string;
  html: string;
}

export interface Browser {
  open(url: string): Promise<OpenedPage>;
  close(): Promise<void>;
}

export type LaunchBrowser = () => Promise<Browser>;

export type OpenPage = (url: string) => Promise<OpenedPage>;

// So that a Source's site is read slowly: the time from one page's end to the next page's start.
const BETWEEN_PAGES = 2000;

// The one place where pages are opened in a browser, for a Source that a plain request cannot read.
@Injectable()
export class BrowserPages {
  private readonly logger = new Logger(BrowserPages.name);

  constructor(@Inject(LAUNCH_BROWSER) private readonly launch: LaunchBrowser) {}

  // A browser lives only for one Collection, since it takes far more memory than the rest of the worker. `read` opens
  // its pages one at a time, waiting for each before it asks for the next.
  async during<T>(read: (open: OpenPage) => Promise<T>): Promise<T> {
    const browser = await this.launch();
    let openedOne = false;
    try {
      return await read(async (url) => {
        if (openedOne) {
          await new Promise((resolve) => {
            setTimeout(resolve, BETWEEN_PAGES);
          });
        }
        openedOne = true;
        return browser.open(url);
      });
    } finally {
      // What was read still counts when the browser does not close.
      await browser.close().catch((error: unknown) => {
        this.logger.warn(`The browser did not close: ${String(error)}`);
      });
    }
  }
}
