/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { SchedulerRegistry } from '@nestjs/schedule';
import { inject } from 'vitest';
import { type BrowserStub, browserServing, type Redirected } from './browser.js';
import {
  collect,
  collected,
  list,
  listed,
  listPages,
  mainServerNotStoring,
  onAFakeClock,
  programme,
  seminar,
} from './extra-snu.js';
import { savedPage } from './pages.js';
import { startApp } from './start-app.js';

const course = savedPage('extra-snu-programme-PGM012002329-2026-10-31');
const SIGN_IN: Redirected = { redirectedTo: 'https://nsso.snu.ac.kr/sso/usr/snu/mfa/login/view' };

describe('A Collection of extra.snu, on the list', () => {
  it('reads the first four pages and asks the main server by key before it opens a programme', async () => {
    const { browser, mainServer } = await collect(
      { ...listPages, [programme('PGM012002414')]: seminar },
      mainServerNotStoring('PGM012002414'),
    );

    expect(browser.opened.map(({ url }) => url)).toEqual([
      list(1),
      list(2),
      list(3),
      list(4),
      programme('PGM012002414'),
    ]);
    expect(mainServer.messages[0]).toEqual({
      path: '/global-events/stored-posts',
      data: { source: 'extra_snu', keys: listed },
    });
  });

  it('stops reading it at a page past its end', async () => {
    const { browser } = await collect(
      { [list(1)]: listPages[list(1)], [list(2)]: savedPage('extra-snu-list-page-8-2026-10-31') },
      mainServerNotStoring(),
    );

    expect(browser.opened.map(({ url }) => url)).toEqual([list(1), list(2)]);
  });
});

describe('A Collection of extra.snu, on its programmes', () => {
  const twoNewProgrammes = { ...listPages, [programme('PGM012002414')]: seminar, [programme('PGM012002329')]: course };

  it('opens one page every two seconds', async () => {
    const { browser } = await collect(twoNewProgrammes, mainServerNotStoring('PGM012002414', 'PGM012002329'));

    const gaps = browser.opened.slice(1).map(({ at }, index) => at - browser.opened[index].at);
    expect(gaps).toEqual([2000, 2000, 2000, 2000, 2000]);
  });

  it('sends each new one as one post with its sessions, and closes the browser', async () => {
    const { browser, mainServer, succeeded } = await collect(
      twoNewProgrammes,
      mainServerNotStoring('PGM012002414', 'PGM012002329'),
    );

    expect(succeeded).toBe(true);
    expect(collected(mainServer)).toMatchObject({
      source: 'extra_snu',
      collectedAt: '2026-10-31T06:00:00.000Z',
      failureReason: null,
      skippedPosts: 0,
      posts: [
        {
          key: 'PGM012002414',
          address: programme('PGM012002414'),
          sessions: [{ number: 1, start: '2026-11-02T10:00:00+09:00', readFrom: 'body' }],
        },
        { key: 'PGM012002329', sessions: [{ number: 1 }, { number: 2 }] },
      ],
    });
    expect(browser.closes).toBe(browser.launches);
  });

  it('opens none, and still sends its message, when the main server stores every one', async () => {
    const { browser, mainServer } = await collect(listPages, mainServerNotStoring());

    expect(browser.opened).toHaveLength(4);
    expect(collected(mainServer)).toEqual({
      source: 'extra_snu',
      collectedAt: '2026-10-31T06:00:00.000Z',
      failureReason: null,
      skippedPosts: 0,
      posts: [],
    });
  });
});

describe('A programme that redirects to the sign-in', () => {
  it.each([
    ['the SSO', SIGN_IN],
    ["the site's own sign-in page", { redirectedTo: 'https://extra.snu.ac.kr/comm/login/user/login.do' }],
  ])('at %s is skipped and counted, and the Collection succeeds', async (_as, redirect) => {
    const { mainServer, succeeded } = await collect(
      { ...listPages, [programme('PGM012002407')]: redirect, [programme('PGM012002414')]: seminar },
      mainServerNotStoring('PGM012002407', 'PGM012002414'),
    );

    expect(succeeded).toBe(true);
    expect(collected(mainServer)).toMatchObject({
      failureReason: null,
      skippedPosts: 1,
      posts: [{ key: 'PGM012002414' }],
    });
    expect(mainServer.from('extra_snu', '/collections/failed')).toEqual([]);
  });

  it('does not fail a Collection that read nothing else', async () => {
    const { mainServer, succeeded } = await collect(
      { ...listPages, [programme('PGM012002407')]: SIGN_IN, [programme('PGM012002417')]: SIGN_IN },
      mainServerNotStoring('PGM012002407', 'PGM012002417'),
    );

    expect(succeeded).toBe(true);
    expect(collected(mainServer)).toMatchObject({ failureReason: null, skippedPosts: 2, posts: [] });
  });
});

async function scheduledCollection(setting: string): Promise<BrowserStub> {
  const browser = browserServing(listPages);
  const app = await startApp(
    { ...inject('settings'), EXTRA_SNU_COLLECTION: setting },
    { mainServer: mainServerNotStoring(), launchBrowser: browser.launch },
  );
  const { ExtraSnuCollector } = await import('../src/event/extra-snu.collector.js');
  await onAFakeClock(() => app.get(ExtraSnuCollector).collect());
  await app.close();
  return browser;
}

describe('The schedule of extra.snu', () => {
  it('off starts nothing: no browser, no page', async () => {
    const browser = await scheduledCollection('off');

    expect(browser.launches).toBe(0);
    expect(browser.opened).toEqual([]);
  });

  it('on starts a Collection', async () => {
    const browser = await scheduledCollection('on');

    expect(browser.opened).toHaveLength(4);
  });

  it('runs at 03:00 and 15:00, apart from the events list', async () => {
    const app = await startApp(inject('settings'));
    const times = [...app.get(SchedulerRegistry).getCronJobs().values()].map((job) => String(job.cronTime.source));
    await app.close();

    expect(times).toContain('0 0 3,15 * * *');
  });
});
