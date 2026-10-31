/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { inject } from 'vitest';
import { type BrowserStub, browserServing, type Redirected } from './browser.js';
import { MainServerStub } from './main-server.js';
import { savedPage } from './pages.js';
import { startApp } from './start-app.js';

const STATES = '&applyChkCdSh=0001&applyChkCdSh=0002&applyChkCdSh=0004';

export const list = (page: number): string =>
  `https://extra.snu.ac.kr/ptfol/pgm/index.do?currentPageNo=${page}${STATES}`;

export const programme = (key: string): string => `https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=${key}`;

// The programmes of the first four pages. The saved pages list twelve each, less those the evaluation holds out, which
// were cut from them so that no test reads a held-out post.
export const listed = [
  'PGM012002407',
  'PGM012002417',
  'PGM012002416',
  'PGM012002414',
  'PGM012002401',
  'PGM012002380',
  'PGM012002379',
  'PGM012002378',
  'PGM012002372',
  'PGM012002361',
  'PGM012002360',
  'PGM012002359',
  'PGM012002329',
];

export const listPages = Object.fromEntries(
  [1, 2, 3, 4].map((page) => [list(page), savedPage(`extra-snu-list-page-${page}-2026-10-31`)]),
);

// A programme's page, as the browser reaches it from its `view.do` address.
export function programmePage(html: string): Redirected {
  return {
    redirectedTo: 'https://extra.snu.ac.kr/ptfol/imng/icmpNsbjtPgm/findIcmpNsbjtPgmInfo.do?encSddpbSeq=91632f592d',
    html,
  };
}

export const seminar = programmePage(savedPage('extra-snu-programme-PGM012002414-2026-10-31'));

// The main server stores every listed programme but those given.
export function mainServerNotStoring(...newKeys: string[]): MainServerStub {
  const mainServer = new MainServerStub();
  mainServer.answers.set('/global-events/stored-posts', { keys: listed.filter((key) => !newKeys.includes(key)) });
  return mainServer;
}

// Longer than any test's Collection takes on the fake clock.
const A_COLLECTION = 60_000;

// Runs what `start` starts to its end, with a clock that the two seconds between pages can be run through.
export async function onAFakeClock<T>(start: () => Promise<T>): Promise<T> {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], now: new Date('2026-10-31T15:00:00+09:00') });
  const running = start();
  await vi.advanceTimersByTimeAsync(A_COLLECTION);
  const result = await running;
  vi.useRealTimers();
  return result;
}

export interface Collected {
  browser: BrowserStub;
  mainServer: MainServerStub;
  succeeded: boolean;
}

// Runs one Collection of extra.snu against `served`, or a browser `launch` gives in its place.
export async function collect(
  served: Record<string, string | Redirected>,
  mainServer: MainServerStub,
  launch?: BrowserStub['launch'],
): Promise<Collected> {
  const browser = browserServing(served);
  const app = await startApp(inject('settings'), { mainServer, launchBrowser: launch ?? browser.launch });
  // Imported after startApp, so that it is the same class AppModule registers.
  const { ExtraSnuCollector } = await import('../src/event/extra-snu.collector.js');
  const succeeded = await onAFakeClock(() => app.get(ExtraSnuCollector).collectOne('extra_snu'));
  await app.close();
  return { browser, mainServer, succeeded };
}

// What the Collection sent, as its one message.
export function collected(mainServer: MainServerStub): Record<string, unknown> {
  const [message] = mainServer.from('extra_snu', '/global-events/collected');
  return message;
}
