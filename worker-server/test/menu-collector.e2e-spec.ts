import { SchedulerRegistry } from '@nestjs/schedule';
import { inject } from 'vitest';
import { MainServerStub } from './main-server.js';
import { blockPage, savedPage } from './pages.js';
import { type Sources, sourcesServing } from './sources.js';
import { startApp } from './start-app.js';

const COOP = 'https://snuco.snu.ac.kr/foodmenu/?date=';
const DORMITORY = 'https://snudorm.snu.ac.kr/foodmenu/?date=';
const VETERINARY = 'https://vet.snu.ac.kr/cafe_menu/';

// Thursday 1 October 2026 and the six days after.
const DAYS = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'];

// A saved page of 2026-10-01 as the page of each day: only the date the page repeats differs.
function dailyPages(address: string, page: string): Record<string, string> {
  return Object.fromEntries(
    DAYS.map((day) => [`${address}${day}`, page.replace('value="2026-10-01"', `value="${day}"`)]),
  );
}

// What the Sources answer on Thursday 1 October 2026.
const pages = {
  ...dailyPages(COOP, savedPage('coop-menus-2026-10-01')),
  ...dailyPages(DORMITORY, savedPage('dormitory-menus-2026-10-01')),
  [VETERINARY]: savedPage('veterinary-menus-2026-10-01'),
};

beforeAll(() => {
  // The run of 05:00 on 1 October 2026 in Asia/Seoul. Only the clock is replaced; timers run as they do.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-01T05:00:00+09:00') });
});

afterAll(() => {
  vi.useRealTimers();
});

// Runs the menu Collections once against `served` and gives what the worker asked for and sent.
async function collect(
  served: Record<string, string | number>,
  mainServer = new MainServerStub(),
): Promise<{ sources: Sources; mainServer: MainServerStub }> {
  const sources = sourcesServing(served);
  const app = await startApp(inject('settings'), { fetchPage: sources.fetch, mainServer });
  // Imported after startApp, so that it is the same class AppModule registers.
  const { MenuCollector } = await import('../src/menu/menu.collector.js');
  await app.get(MenuCollector).collect();
  await app.close();
  return { sources, mainServer };
}

// Runs the command with `names` against `served` and gives its answer with what the worker asked for and sent.
async function runCommand(
  names: string[],
  served: Record<string, string | number> = pages,
): Promise<{ taken: boolean; sources: Sources; mainServer: MainServerStub }> {
  const sources = sourcesServing(served);
  const mainServer = new MainServerStub();
  const app = await startApp(inject('settings'), { fetchPage: sources.fetch, mainServer });
  // Imported after startApp, so that it finds the collectors AppModule registers.
  const { collectSources } = await import('../src/collect-sources.js');
  const taken = await collectSources(app, names);
  await app.close();
  return { taken, sources, mainServer };
}

describe('A Collection of the menu Sources', () => {
  it('sends the menus of today and the six days after of each Source', async () => {
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
              {
                name: '수의대식당',
                lines: [{ meal: 'lunch', text: '카레라이스', kind: null, name: null, price: null }],
              },
            ],
          },
          {
            date: '2026-10-02',
            restaurants: [
              {
                name: '수의대식당',
                lines: [{ meal: 'lunch', text: '소불고기덮밥', kind: null, name: null, price: null }],
              },
            ],
          },
          // The table holds this week only.
          { date: '2026-10-03', restaurants: [] },
          { date: '2026-10-04', restaurants: [] },
          { date: '2026-10-05', restaurants: [] },
          { date: '2026-10-06', restaurants: [] },
          { date: '2026-10-07', restaurants: [] },
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
      { days: DAYS.map((date) => ({ date, restaurants: coopRestaurants })) },
    ]);
    expect(mainServer.from('dormitory_menus')).toMatchObject([
      {
        days: DAYS.map((date) => ({ date, restaurants: [{ name: '아워홈(901동)' }, { name: '생협기숙사(919동)' }] })),
      },
    ]);
  });
});

describe('The requests of a Collection', () => {
  it('ask for one page at a time and name the project', async () => {
    const { sources } = await collect(pages);

    expect(sources.requests.map(({ url }) => url)).toEqual([
      ...DAYS.map((day) => `${COOP}${day}`),
      ...DAYS.map((day) => `${DORMITORY}${day}`),
      VETERINARY,
    ]);
    expect(sources.mostAtOnce).toBe(1);
    expect(new Set(sources.requests.map(({ userAgent }) => userAgent))).toEqual(
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

describe('The command that runs one Collection', () => {
  it('collects the Source it names and no other', async () => {
    const { taken, sources, mainServer } = await runCommand(['dormitory_menus']);

    expect(taken).toBe(true);
    expect(sources.requests.map(({ url }) => url)).toEqual(DAYS.map((day) => `${DORMITORY}${day}`));
    expect(mainServer.messages.map(({ pattern, data }) => [pattern, data['source']])).toEqual([
      ['menus-collected', 'dormitory_menus'],
    ]);
  });

  it('collects each Source when it names several', async () => {
    const { taken, mainServer } = await runCommand(['coop_menus', 'veterinary_menus']);

    expect(taken).toBe(true);
    expect(mainServer.messages.map(({ data }) => data['source'])).toEqual(['coop_menus', 'veterinary_menus']);
  });

  it('says that a Collection was not taken, and reports it as failed', async () => {
    const { taken, mainServer } = await runCommand(['veterinary_menus'], { ...pages, [VETERINARY]: blockPage });

    expect(taken).toBe(false);
    expect(mainServer.from('veterinary_menus', 'collection-failed')).toHaveLength(1);
  });

  it.each([[['library_seats']], [['coop_menus', 'library_seats']], [[]]])(
    'collects nothing when it is given %j',
    async (names) => {
      const sources = sourcesServing(pages);
      const app = await startApp(inject('settings'), { fetchPage: sources.fetch, mainServer: new MainServerStub() });
      const { collectSources } = await import('../src/collect-sources.js');

      await expect(collectSources(app, names)).rejects.toThrow(
        'Name one or more of: coop_menus, dormitory_menus, veterinary_menus',
      );
      await app.close();
      expect(sources.requests).toEqual([]);
    },
  );
});

describe('The worker at its start', () => {
  it('collects nothing', async () => {
    const sources = sourcesServing(pages);
    const mainServer = new MainServerStub();

    const app = await startApp(inject('settings'), { fetchPage: sources.fetch, mainServer });
    await app.close();

    expect(sources.requests).toEqual([]);
    expect(mainServer.messages).toEqual([]);
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
