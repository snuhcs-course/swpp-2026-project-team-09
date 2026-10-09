// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #30
import { SchedulerRegistry } from '@nestjs/schedule';
import { inject } from 'vitest';
import { MainServerStub } from './main-server.js';
import { blockPage, savedPage } from './pages.js';
import { type Sources, sourcesServing } from './sources.js';
import { startApp } from './start-app.js';

// The events list from 2 October 2026 to a year later, page by page.
const LIST = 'https://www.snu.ac.kr/snunow/events?sc=y&df=2026.10.02&dt=2027.10.02&page=';
const POST = 'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=';

const firstPage = [176576, 176564, 176561, 176558, 176549, 176540, 176525, 176522, 176519, 176516, 176510, 176504];
const secondPage = [176492, 176489, 176486, 176450, 176444, 176432, 176429, 176414, 176402, 176375, 176360, 176354];

// What the Source answers on 2 October 2026: two pages of posts, then the page past the end, as page 9 answered it.
const pages = {
  [`${LIST}1`]: savedPage('snu-events-list-page-1-2026-10-02'),
  [`${LIST}2`]: savedPage('snu-events-list-page-2-2026-10-02'),
  [`${LIST}3`]: savedPage('snu-events-list-page-9-2026-10-02'),
  [`${POST}176558`]: savedPage('snu-events-post-176558-2026-10-02'),
  [`${POST}176525`]: savedPage('snu-events-post-176525-2026-10-02'),
};

// The main server stores every listed post but 176558 and 176525.
function mainServerStoring(
  stored = [...firstPage, ...secondPage].filter((post) => post !== 176558 && post !== 176525),
): MainServerStub {
  const mainServer = new MainServerStub();
  mainServer.answers.set('/global-events/stored-posts', { postNumbers: stored });
  return mainServer;
}

beforeAll(() => {
  // The run of 06:00 on 2 October 2026 in Asia/Seoul. Only the clock is replaced; timers run as they do.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-02T06:00:00+09:00') });
});

afterAll(() => {
  vi.useRealTimers();
});

// Runs the Collection of the events list once against `served` and gives what the worker asked for and sent.
async function collect(
  served: Record<string, string | number> = pages,
  mainServer = mainServerStoring(),
): Promise<{ sources: Sources; mainServer: MainServerStub }> {
  const sources = sourcesServing(served);
  const app = await startApp(inject('settings'), { fetchPage: sources.fetch, mainServer });
  // Imported after startApp, so that it is the same class AppModule registers.
  const { EventCollector } = await import('../src/event/event.collector.js');
  await app.get(EventCollector).collect();
  await app.close();
  return { sources, mainServer };
}

describe('A Collection of the events list', () => {
  it('lists the posts page by page until the list ends, and asks the main server which it stores', async () => {
    const { sources, mainServer } = await collect();

    expect(sources.requests.slice(0, 3).map(({ url }) => url)).toEqual([`${LIST}1`, `${LIST}2`, `${LIST}3`]);
    expect(mainServer.messages[0]).toEqual({
      path: '/global-events/stored-posts',
      data: { postNumbers: [...firstPage, ...secondPage] },
    });
  });

  it('reads the posts the main server does not store, one page at a time, and sends them', async () => {
    const { sources, mainServer } = await collect();

    expect(sources.requests.slice(3).map(({ url }) => url)).toEqual([`${POST}176558`, `${POST}176525`]);
    expect(sources.mostAtOnce).toBe(1);
    expect(mainServer.from('snu_events', '/global-events/collected')).toMatchObject([
      {
        collectedAt: '2026-10-01T21:00:00.000Z',
        failureReason: null,
        events: [
          { postNumber: 176558, start: '2026-10-26', end: '2026-11-27', readFrom: 'body' },
          {
            postNumber: 176525,
            start: '2026-10-13T17:00:00+09:00',
            place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
          },
        ],
      },
    ]);
  });

  it('sends no event, and reads no post, when the main server stores every post', async () => {
    const { sources, mainServer } = await collect(pages, mainServerStoring([...firstPage, ...secondPage]));

    expect(sources.requests).toHaveLength(3);
    expect(mainServer.from('snu_events', '/global-events/collected')).toEqual([
      { source: 'snu_events', collectedAt: '2026-10-01T21:00:00.000Z', failureReason: null, events: [] },
    ]);
  });
});

// A page that is neither the post asked for nor the firewall's block page.
const notAPost = '<html><body><p>존재하지 않는 게시물입니다.</p></body></html>';

describe('A Collection of the events list that is blocked on a post', () => {
  it('hands over why it stopped, and reads no further post', async () => {
    const { sources, mainServer } = await collect({ ...pages, [`${POST}176558`]: blockPage });

    expect(mainServer.from('snu_events', '/global-events/collected')).toEqual([
      {
        source: 'snu_events',
        collectedAt: '2026-10-01T21:00:00.000Z',
        failureReason: `The university's firewall blocked ${POST}176558`,
        events: [],
      },
    ]);
    expect(mainServer.from('snu_events', '/collections/failed')).toEqual([]);
    expect(sources.requests.at(-1)?.url).toBe(`${POST}176558`);
  });

  it('hands over the posts read before it with why it stopped, in one request, so that they are not read again', async () => {
    // 176558 is read, then 176525 is blocked.
    const { mainServer } = await collect({ ...pages, [`${POST}176525`]: blockPage });

    expect(mainServer.messages.map(({ path }) => path)).toEqual([
      '/global-events/stored-posts',
      '/global-events/collected',
    ]);
    expect(mainServer.from('snu_events', '/global-events/collected')).toMatchObject([
      { failureReason: `The university's firewall blocked ${POST}176525`, events: [{ postNumber: 176558 }] },
    ]);
  });
});

describe('A post whose page is not a post', () => {
  it('is sent with its title from the list alone, and the posts after it are read', async () => {
    const { mainServer } = await collect({ ...pages, [`${POST}176558`]: notAPost });

    expect(mainServer.from('snu_events', '/collections/failed')).toEqual([]);
    expect(mainServer.from('snu_events', '/global-events/collected')).toMatchObject([
      {
        failureReason: null,
        events: [
          {
            postNumber: 176558,
            sourceUrl: `${POST}176558`,
            title: '[스포츠진흥원]2026학년도 서울대학교 종합체육대회 개최 안내',
            description: '',
            start: null,
            end: null,
            readFrom: null,
            place: null,
          },
          { postNumber: 176525, readFrom: 'body' },
        ],
      },
    ]);
  });

  it('is sent when the list ends after it', async () => {
    const { mainServer } = await collect({ ...pages, [`${POST}176525`]: notAPost });

    expect(mainServer.from('snu_events', '/global-events/collected')).toMatchObject([
      { failureReason: null, events: [{ postNumber: 176558 }, { postNumber: 176525, description: '' }] },
    ]);
  });

  it('is kept back when the Collection is blocked before a post after it is read', async () => {
    const { mainServer } = await collect({ ...pages, [`${POST}176558`]: notAPost, [`${POST}176525`]: blockPage });

    expect(mainServer.from('snu_events', '/global-events/collected')).toMatchObject([
      { failureReason: `The university's firewall blocked ${POST}176525`, events: [] },
    ]);
  });
});

describe('Posts whose pages are not posts, in a Collection that reads no post', () => {
  it('fail the Collection, and none of them is sent', async () => {
    const { mainServer } = await collect({ ...pages, [`${POST}176558`]: notAPost, [`${POST}176525`]: notAPost });

    expect(mainServer.from('snu_events', '/global-events/collected')).toMatchObject([
      { failureReason: 'No post could be read: The page has no post', events: [] },
    ]);
  });
});

describe('Three posts in a row whose pages are not posts', () => {
  it('fail the Collection, and none of them is sent', async () => {
    // 176558 is read; 176549, 176540 and 176525 are not posts.
    const unstored = new Set([176558, 176549, 176540, 176525]);
    const { mainServer } = await collect(
      { ...pages, [`${POST}176549`]: notAPost, [`${POST}176540`]: notAPost, [`${POST}176525`]: notAPost },
      mainServerStoring([...firstPage, ...secondPage].filter((post) => !unstored.has(post))),
    );

    expect(mainServer.from('snu_events', '/global-events/collected')).toMatchObject([
      { failureReason: '3 posts in a row could not be read: The page has no post', events: [{ postNumber: 176558 }] },
    ]);
    expect(mainServer.from('snu_events', '/collections/failed')).toEqual([]);
  });
});

describe('A Collection of the events list that fails before reading a post', () => {
  it('reports a page of the list it cannot read, and asks nothing', async () => {
    const { mainServer } = await collect({ ...pages, [`${LIST}2`]: blockPage });

    expect(mainServer.messages).toEqual([
      {
        path: '/collections/failed',
        data: {
          source: 'snu_events',
          failedAt: '2026-10-01T21:00:00.000Z',
          reason: `The university's firewall blocked ${LIST}2`,
        },
      },
    ]);
  });

  it('reports a list that does not end', async () => {
    // Page 2 answers with page 1, as a list that answered every page past the first with the first would.
    const { sources, mainServer } = await collect({ ...pages, [`${LIST}2`]: pages[`${LIST}1`] });

    expect(mainServer.from('snu_events', '/collections/failed')).toMatchObject([
      { reason: 'Page 2 of the events list repeats the posts before it' },
    ]);
    expect(sources.requests).toHaveLength(2);
  });

  it('reports a question the main server does not answer, and reads no post', async () => {
    const mainServer = new MainServerStub();
    mainServer.refusals.set('/global-events/stored-posts', 'postNumbers.0: Invalid input');

    const { sources } = await collect(pages, mainServer);

    expect(mainServer.from('snu_events', '/collections/failed')).toMatchObject([
      { reason: 'The main server did not take /global-events/stored-posts: postNumbers.0: Invalid input' },
    ]);
    expect(sources.requests).toHaveLength(3);
  });

  it('reports an answer to its question that is not the one asked for, and reads no post', async () => {
    const mainServer = new MainServerStub();
    mainServer.answers.set('/global-events/stored-posts', { stored: [] });

    const { sources } = await collect(pages, mainServer);

    expect(mainServer.from('snu_events', '/collections/failed')).toMatchObject([
      { reason: "The main server's answer to /global-events/stored-posts is not the one asked for" },
    ]);
    expect(sources.requests).toHaveLength(3);
  });
});

describe('The schedule of the Collections of the events list', () => {
  it('runs them four times a day in Asia/Seoul', async () => {
    const app = await startApp(inject('settings'));

    const jobs = [...app.get(SchedulerRegistry).getCronJobs().values()];
    await app.close();

    // The clock stands at 06:00 on 2 October.
    expect(jobs.map((job) => job.nextDates(4).map((run) => run.toJSDate()))).toContainEqual([
      new Date('2026-10-02T12:00:00+09:00'),
      new Date('2026-10-02T18:00:00+09:00'),
      new Date('2026-10-03T00:00:00+09:00'),
      new Date('2026-10-03T06:00:00+09:00'),
    ]);
  });
});

describe('The command that runs one Collection', () => {
  it('collects the events list when it names it, and no other Source', async () => {
    const sources = sourcesServing(pages);
    const mainServer = mainServerStoring();
    const app = await startApp(inject('settings'), { fetchPage: sources.fetch, mainServer });
    const { collectSources } = await import('../src/collect-sources.js');

    const succeeded = await collectSources(app, ['snu_events']);
    await app.close();

    expect(succeeded).toBe(true);
    expect(sources.requests.every(({ url }) => url.startsWith('https://www.snu.ac.kr/snunow/events?'))).toBe(true);
    expect(mainServer.messages.map(({ path }) => path)).toEqual([
      '/global-events/stored-posts',
      '/global-events/collected',
    ]);
  });

  it('gives that the Collection failed when it stopped early, though the main server took what it read', async () => {
    const sources = sourcesServing({ ...pages, [`${POST}176525`]: blockPage });
    const app = await startApp(inject('settings'), { fetchPage: sources.fetch, mainServer: mainServerStoring() });
    const { collectSources } = await import('../src/collect-sources.js');

    const succeeded = await collectSources(app, ['snu_events']);
    await app.close();

    expect(succeeded).toBe(false);
  });
});
