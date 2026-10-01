import { SchedulerRegistry } from '@nestjs/schedule';
import { inject } from 'vitest';
import { MainServerStub } from './main-server.js';
import { savedPage } from './pages.js';
import { type Sites, sitesServing } from './sites.js';
import { startApp } from './start-app.js';

const COOP = 'https://snuco.snu.ac.kr/foodmenu/?date=';
const DORMITORY = 'https://snudorm.snu.ac.kr/foodmenu/?date=';
const VETERINARY = 'https://vet.snu.ac.kr/cafe_menu/';

// A saved page of 2026-10-01 as the page of the day after: only the date the page repeats differs.
function dayAfter(page: string): string {
  return page.replace('value="2026-10-01"', 'value="2026-10-02"');
}

const coopPage = savedPage('coop-menus-2026-10-01');
const dormitoryPage = savedPage('dormitory-menus-2026-10-01');

// What the sites answer on Thursday 1 October 2026.
const pages = {
  [`${COOP}2026-10-01`]: coopPage,
  [`${COOP}2026-10-02`]: dayAfter(coopPage),
  [`${DORMITORY}2026-10-01`]: dormitoryPage,
  [`${DORMITORY}2026-10-02`]: dayAfter(dormitoryPage),
  [VETERINARY]: savedPage('veterinary-menus-2026-10-01'),
};

beforeAll(() => {
  // The run of 05:00 on 1 October 2026 in Asia/Seoul. Only the clock is replaced; timers run as they do.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-01T05:00:00+09:00') });
});

afterAll(() => {
  vi.useRealTimers();
});

// Runs the menu Collections once against `sitePages` and gives what the worker asked the sites and sent.
async function collect(
  sitePages: Record<string, string | number>,
  mainServer = new MainServerStub(),
): Promise<{ sites: Sites; mainServer: MainServerStub }> {
  const sites = sitesServing(sitePages);
  const app = await startApp(inject('settings'), { fetchPage: sites.fetch, mainServer });
  // Imported after startApp, so that it is the same class AppModule registers.
  const { MenuCollector } = await import('../src/menu/menu.collector.js');
  await app.get(MenuCollector).collect();
  await app.close();
  return { sites, mainServer };
}

describe('A Collection of the menu Sources', () => {
  it("sends today's and tomorrow's menus of each Source", async () => {
    const { mainServer } = await collect(pages);

    expect(mainServer.messages.map(({ pattern }) => pattern)).toEqual([
      'menus-collected',
      'menus-collected',
      'menus-collected',
    ]);
    expect(mainServer.from('veterinary_menus')).toEqual([
      {
        source: 'veterinary_menus',
        collectedAt: '2026-09-30T20:00:00.000Z',
        days: [
          {
            date: '2026-10-01',
            restaurants: [
              { name: '수의대식당', lines: [{ meal: 'lunch', text: '카레라이스', kind: 'dish', price: null }] },
            ],
          },
          {
            date: '2026-10-02',
            restaurants: [
              { name: '수의대식당', lines: [{ meal: 'lunch', text: '소불고기덮밥', kind: 'dish', price: null }] },
            ],
          },
        ],
      },
    ]);
  });
});

describe("The Collection of the Co-op's page", () => {
  it("leaves out the fixed-menu restaurants and the page's row of the dormitory's restaurant", async () => {
    const { mainServer } = await collect(pages);

    const coopRestaurants = [
      '학생회관식당',
      '자하연식당 3층',
      '자하연식당 2층',
      '예술계식당',
      '두레미담',
      '동원관식당',
      '3식당',
      '302동식당',
      '301동식당',
    ].map((name) => ({ name }));
    expect(mainServer.from('coop_menus')).toMatchObject([
      {
        days: [
          { date: '2026-10-01', restaurants: coopRestaurants },
          { date: '2026-10-02', restaurants: coopRestaurants },
        ],
      },
    ]);
    expect(mainServer.from('dormitory_menus')).toMatchObject([
      {
        days: [
          { date: '2026-10-01', restaurants: [{ name: '아워홈(901동)' }, { name: '생협기숙사(919동)' }] },
          { date: '2026-10-02', restaurants: [{ name: '아워홈(901동)' }, { name: '생협기숙사(919동)' }] },
        ],
      },
    ]);
  });
});

describe('The requests of a Collection', () => {
  it('ask for one page at a time and name the project', async () => {
    const { sites } = await collect(pages);

    expect(sites.requests.map(({ url }) => url)).toEqual([
      `${COOP}2026-10-01`,
      `${COOP}2026-10-02`,
      `${DORMITORY}2026-10-01`,
      `${DORMITORY}2026-10-02`,
      VETERINARY,
    ]);
    expect(sites.mostAtOnce).toBe(1);
    expect(new Set(sites.requests.map(({ userAgent }) => userAgent))).toEqual(
      new Set(['SNUNow/1.0 (SNU SWPP 2026 team 9; +https://github.com/snuhcs-course/swpp-2026-project-team-09)']),
    );
  });
});

describe('A Collection that cannot fetch or read a page', () => {
  it('reports the Source as failed when a page does not come, and still collects the others', async () => {
    const { mainServer } = await collect({ ...pages, [`${DORMITORY}2026-10-02`]: 503 });

    expect(mainServer.from('dormitory_menus', 'collection-failed')).toEqual([
      {
        source: 'dormitory_menus',
        failedAt: '2026-09-30T20:00:00.000Z',
        reason: 'https://snudorm.snu.ac.kr/foodmenu/?date=2026-10-02 answered 503',
      },
    ]);
    expect(mainServer.from('dormitory_menus')).toEqual([]);
    expect(mainServer.from('coop_menus')).toHaveLength(1);
    expect(mainServer.from('veterinary_menus')).toHaveLength(1);
  });

  it('reports the Source as failed when a page is not the one the parser knows', async () => {
    // What the university's firewall answers a blocked request with, as external-sources.md, 2 describes it.
    const blockPage =
      '<html><head><meta http-equiv="refresh" content="0; url=https://snucert.snu.ac.kr/waf/error.html"></head></html>';

    const { mainServer } = await collect({ ...pages, [VETERINARY]: blockPage });

    expect(mainServer.from('veterinary_menus', 'collection-failed')).toEqual([
      { source: 'veterinary_menus', failedAt: '2026-09-30T20:00:00.000Z', reason: 'The page has no week table' },
    ]);
    expect(mainServer.from('veterinary_menus')).toEqual([]);
  });
});

describe('A Collection whose menus the main server refuses', () => {
  it('is reported as failed, with the answer of the main server', async () => {
    const mainServer = new MainServerStub();
    mainServer.refusals.set('menus-collected', 'days.0.date: Invalid ISO date');

    await collect(pages, mainServer);

    expect(mainServer.from('coop_menus', 'collection-failed')).toEqual([
      {
        source: 'coop_menus',
        failedAt: '2026-09-30T20:00:00.000Z',
        reason: 'The main server did not take menus-collected: days.0.date: Invalid ISO date',
      },
    ]);
  });
});

describe('The schedule of the menu Collections', () => {
  it('runs them at 05:00 and 10:00 in Asia/Seoul', async () => {
    const app = await startApp(inject('settings'));

    const jobs = [...app.get(SchedulerRegistry).getCronJobs().values()];
    await app.close();

    // The clock stands at 05:00 on 1 October.
    expect(jobs.map((job) => job.nextDates(3).map((run) => run.toJSDate()))).toEqual([
      [
        new Date('2026-10-01T10:00:00+09:00'),
        new Date('2026-10-02T05:00:00+09:00'),
        new Date('2026-10-02T10:00:00+09:00'),
      ],
    ]);
  });
});
