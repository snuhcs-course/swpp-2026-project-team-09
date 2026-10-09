/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { SchedulerRegistry } from '@nestjs/schedule';
import { inject } from 'vitest';
import { MainServerStub } from './main-server.js';
import { blockPage, savedAnswer, savedPage } from './pages.js';
import { type Sources, sourcesServing } from './sources.js';
import { startApp } from './start-app.js';

const ROUTE_PAGE = 'https://web.busin.co.kr/BuslineCircleS.aspx?cd=snu_1&di=41946&tab=F';
const VEHICLE_POSITIONS = 'https://web.busin.co.kr/BuslineCircleS.aspx/GetRoute';
const USER_AGENT = 'SNUNow/1.0 (SNU SWPP 2026 team 9; +https://github.com/snuhcs-course/swpp-2026-project-team-09)';

// What the operator answered at 15:40 on Friday 2 October 2026.
const pages = {
  [ROUTE_PAGE]: savedPage('shuttle-stops-2026-10-02'),
  [VEHICLE_POSITIONS]: savedAnswer('shuttle-vehicles-2026-10-02'),
};

beforeEach(() => {
  // When the answers arrived. Only the clock is replaced; timers run as they do.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-02T15:40:07+09:00') });
});

afterEach(() => {
  vi.useRealTimers();
});

// Runs one Collection of the route page or of the vehicle positions against `served`, and gives what the worker asked
// for and sent.
async function collect(
  what: 'stops' | 'vehicles',
  served: Record<string, string | number> = pages,
  mainServer = new MainServerStub(),
): Promise<{ sources: Sources; mainServer: MainServerStub }> {
  const sources = sourcesServing(served);
  const app = await startApp(inject('settings'), { fetchPage: sources.fetch, mainServer });
  // Imported after startApp, so that it is the same class AppModule registers.
  const { ShuttleCollector } = await import('../src/shuttle/shuttle.collector.js');
  const collector = app.get(ShuttleCollector);
  await (what === 'stops' ? collector.collectStops() : collector.collectVehicles());
  await app.close();
  return { sources, mainServer };
}

describe('A Collection of the route page', () => {
  it('sends its stops in loop order, each at its place on the drawing, and its service hours', async () => {
    const { sources, mainServer } = await collect('stops');

    const [message] = mainServer.from('shuttle_stops', '/shuttle/stops/collected');
    expect(mainServer.tokens).toEqual([`Bearer ${inject('settings').WORKER_TOKEN}`]);
    expect(message).toMatchObject({ source: 'shuttle_stops', collectedAt: '2026-10-02T06:40:07.000Z' });
    expect(message?.['stops']).toHaveLength(14);
    expect(message?.['stops']).toContainEqual({ name: '38동', left: 195, top: 239 });
    expect(message?.['serviceHours']).toMatch(/^· 운행시간 안내\(주말,공휴일,개교기념일 미운행\)\n/u);
    expect(sources.requests).toEqual([
      { url: ROUTE_PAGE, method: 'GET', userAgent: USER_AGENT, contentType: null, body: null },
    ]);
  });

  it('fails when the page is not the route page the parser knows', async () => {
    const { mainServer } = await collect('stops', { [ROUTE_PAGE]: blockPage });

    expect(mainServer.messages).toEqual([
      {
        path: '/collections/failed',
        data: {
          source: 'shuttle_stops',
          failedAt: '2026-10-02T06:40:07.000Z',
          reason: 'The page has no stops of the route',
        },
      },
    ]);
  });

  it("fails when the main server refuses the stops, with the main server's answer", async () => {
    const mainServer = new MainServerStub();
    mainServer.refusals.set('/shuttle/stops/collected', 'stops: the seed does not know 법학관');

    await collect('stops', pages, mainServer);

    expect(mainServer.from('shuttle_stops', '/collections/failed')).toEqual([
      {
        source: 'shuttle_stops',
        failedAt: '2026-10-02T06:40:07.000Z',
        reason: 'The main server did not take /shuttle/stops/collected: stops: the seed does not know 법학관',
      },
    ]);
  });
});

describe('A Collection of the vehicle positions', () => {
  it('asks as the route page does, with a POST of the route as JSON', async () => {
    const { sources } = await collect('vehicles');

    expect(sources.requests).toEqual([
      {
        url: VEHICLE_POSITIONS,
        method: 'POST',
        userAgent: USER_AGENT,
        contentType: 'application/json; charset=utf-8',
        body: '{"data":",F,41946,snu_1"}',
      },
    ]);
  });

  it('sends each vehicle with its carid and its position on the drawing, received now', async () => {
    const { mainServer } = await collect('vehicles');

    expect(mainServer.from('shuttle_vehicles', '/shuttle/vehicles/collected')).toEqual([
      {
        source: 'shuttle_vehicles',
        collectedAt: '2026-10-02T06:40:07.000Z',
        vehicles: [
          { carId: '4522', x: 157, y: 40 },
          { carId: '4521', x: 195, y: 294 },
          { carId: '4531', x: 195, y: 294 },
          { carId: '4536', x: 195, y: 294 },
          { carId: '4520', x: 157, y: 398 },
          { carId: '4524', x: 116, y: 294 },
        ],
      },
    ]);
  });

  it('sends an empty answer as no vehicles', async () => {
    // `d` emptied, as the operator answered on Sunday 2026-09-27, when no vehicle ran.
    const empty = pages[VEHICLE_POSITIONS].replace(/"d":".*"/u, '"d":""');

    const { mainServer } = await collect('vehicles', { [VEHICLE_POSITIONS]: empty });

    expect(mainServer.from('shuttle_vehicles', '/shuttle/vehicles/collected')).toMatchObject([{ vehicles: [] }]);
  });
});

// The next three runs of each scheduled job, with the clock at `now`.
async function nextRuns(now: string): Promise<Date[][]> {
  vi.setSystemTime(new Date(now));
  const app = await startApp(inject('settings'));
  const jobs = [...app.get(SchedulerRegistry).getCronJobs().values()];
  await app.close();
  return jobs.map((job) => job.nextDates(3).map((run) => run.toJSDate()));
}

// Starts a Collection of the vehicle positions, then one of the route page, against `served`, lets 6 seconds pass,
// and gives whether the main server took each.
async function collectWithoutAnswer(
  served: Record<string, string | null>,
  mainServer: MainServerStub,
): Promise<{ stops: boolean; vehicles: boolean }> {
  const sources = sourcesServing(served);
  const app = await startApp(inject('settings'), { fetchPage: sources.fetch, mainServer });
  const { ShuttleCollector } = await import('../src/shuttle/shuttle.collector.js');
  const collector = app.get(ShuttleCollector);
  const vehicles = collector.collectOne('shuttle_vehicles');
  const stops = collector.collectOne('shuttle_stops');
  // 5 seconds without an answer, and the page asked for after it.
  await vi.advanceTimersByTimeAsync(6000);
  const taken = { vehicles: await vehicles, stops: await stops };
  await app.close();
  return taken;
}

describe('The schedule of the shuttle Collections', () => {
  it('reads the route page every day at 07:00 in Asia/Seoul', async () => {
    expect(await nextRuns('2026-10-02T15:40:07+09:00')).toContainEqual([
      new Date('2026-10-03T07:00:00+09:00'),
      new Date('2026-10-04T07:00:00+09:00'),
      new Date('2026-10-05T07:00:00+09:00'),
    ]);
  });

  it('asks for the vehicles every 15 seconds on weekdays from 08:00 to 21:00 in Asia/Seoul', async () => {
    // Friday evening, just before 21:00.
    expect(await nextRuns('2026-10-02T20:59:40+09:00')).toContainEqual([
      new Date('2026-10-02T20:59:45+09:00'),
      new Date('2026-10-05T08:00:00+09:00'),
      new Date('2026-10-05T08:00:15+09:00'),
    ]);
  });
});

describe('A vehicle Collection while the menu pages do not answer', () => {
  it("does not wait for them: a collector's pages wait only for its own", async () => {
    // A Saturday, with the timers replaced too, so that the menu pages are given up only when the test says.
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
      now: new Date('2026-10-03T12:00:00+09:00'),
    });
    const days = ['03', '04', '05', '06', '07', '08', '09'].map((day) => `2026-10-${day}`);
    const menuPages = [
      ...days.map((day) => `https://snuco.snu.ac.kr/foodmenu/?date=${day}`),
      ...days.map((day) => `https://snudorm.snu.ac.kr/foodmenu/?date=${day}`),
      'https://vet.snu.ac.kr/cafe_menu/',
    ];
    const unanswered = Object.fromEntries(menuPages.map((address) => [address, null]));
    const mainServer = new MainServerStub();
    const sources = sourcesServing({ ...pages, ...unanswered });
    const app = await startApp(inject('settings'), { fetchPage: sources.fetch, mainServer });
    const { MenuCollector } = await import('../src/menu/menu.collector.js');
    const { ShuttleCollector } = await import('../src/shuttle/shuttle.collector.js');

    const menus = app.get(MenuCollector).collect();
    const vehicles = app.get(ShuttleCollector).collectVehicles();
    // Well within the 5 seconds for which the first menu page is waited for.
    await vi.advanceTimersByTimeAsync(100);
    await vehicles;

    expect(sources.requests.map(({ url }) => url)).toEqual([menuPages[0], VEHICLE_POSITIONS]);
    expect(mainServer.from('shuttle_vehicles', '/shuttle/vehicles/collected')).toHaveLength(1);
    // The fifteen menu pages, each given up after 5 seconds.
    await vi.advanceTimersByTimeAsync(80_000);
    await menus;
    await app.close();
  });
});

describe('A Collection that gets no answer', () => {
  beforeEach(() => {
    // A Saturday, when no vehicle Collection is due, with the timers replaced too.
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
      now: new Date('2026-10-03T12:00:00+09:00'),
    });
  });

  it('gives up on a Source after 5 seconds, so that the next page is asked for', async () => {
    const mainServer = new MainServerStub();

    const taken = await collectWithoutAnswer({ ...pages, [VEHICLE_POSITIONS]: null }, mainServer);

    expect(taken).toEqual({ vehicles: false, stops: true });
    expect(mainServer.from('shuttle_vehicles', '/collections/failed')).toEqual([
      {
        source: 'shuttle_vehicles',
        failedAt: '2026-10-03T03:00:00.000Z',
        reason: `${VEHICLE_POSITIONS} did not answer within 5 seconds`,
      },
    ]);
  });

  it('gives up on the main server after 5 seconds, and reports the Collection as failed', async () => {
    const mainServer = new MainServerStub();
    mainServer.unanswered.add('/shuttle/vehicles/collected');

    const taken = await collectWithoutAnswer(pages, mainServer);

    expect(taken).toEqual({ vehicles: false, stops: true });
    expect(mainServer.from('shuttle_vehicles', '/collections/failed')).toMatchObject([
      { reason: 'The main server did not take /shuttle/vehicles/collected: no answer within 5 seconds' },
    ]);
  });
});

describe('The command that runs one Collection', () => {
  it('collects the shuttle Source it names and no other, though a scheduled run falls due meanwhile', async () => {
    // Friday, a second before a run of the vehicle positions, with the timers replaced too.
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
      now: new Date('2026-10-02T15:39:59+09:00'),
    });
    const sources = sourcesServing(pages);
    const mainServer = new MainServerStub();
    const app = await startApp(inject('settings'), { fetchPage: sources.fetch, mainServer });
    // Imported after startApp, so that it finds the collectors AppModule registers.
    const { collectSources } = await import('../src/collect-sources.js');

    const collected = collectSources(app, ['shuttle_stops']);
    await vi.advanceTimersByTimeAsync(2000);
    const taken = await collected;
    await app.close();

    expect(taken).toBe(true);
    expect(sources.requests.map(({ url }) => url)).toEqual([ROUTE_PAGE]);
    expect(mainServer.messages.map(({ path }) => path)).toEqual(['/shuttle/stops/collected']);
  });
});
