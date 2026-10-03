import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Redis } from 'ioredis';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { Settings } from '../src/common/settings.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  getAsUser,
  invalidMessages,
  ROUTE_PAGE_STOPS,
  routeSchema,
  SERVICE_HOURS,
  stopsMessage,
  vehiclesMessage,
  vehiclesSchema,
} from './shuttle.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';
import { refusal, sendAsWorker } from './worker.js';

// The shuttle's stops and route are one set of records in the shared database and its vehicles one key in Redis, so
// only this file sends shuttle messages, one test after the other.
let app: INestApplication<Server>;
let accessToken: string;
// No route serves the Collection status yet (P12 adds one), so the tests read it with a connection of their own.
let prisma: PrismaClient;
// Stands for the socket server: NestJS messaging publishes each event on a Redis channel named after it.
let socketServer: Redis;
const events: unknown[] = [];

beforeAll(async () => {
  app = await startApp(inject('settings'));
  ({ accessToken } = await signIn(app));
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('settings').DATABASE_URL }) });
  const settings = app.get<ConfigService<Settings, true>>(ConfigService);
  socketServer = new Redis({
    host: settings.get('REDIS_HOST', { infer: true }),
    port: settings.get('REDIS_PORT', { infer: true }),
  });
  socketServer.on('message', (_channel: string, message: string) => {
    events.push(JSON.parse(message));
  });
  await socketServer.subscribe('shuttle-vehicles-updated');
});

afterAll(async () => {
  await Promise.all([socketServer.quit(), prisma.$disconnect()]);
  await app.close();
});

async function servedRoute(): Promise<ReturnType<typeof routeSchema.parse>> {
  const response = await getAsUser(app, accessToken, '/shuttle');
  expect(response.status).toBe(200);
  return routeSchema.parse(response.body);
}

async function servedVehicles(): Promise<ReturnType<typeof vehiclesSchema.parse>> {
  const response = await getAsUser(app, accessToken, '/shuttle/vehicles');
  expect(response.status).toBe(200);
  return vehiclesSchema.parse(response.body);
}

async function sendVehicles(vehicles: object[], changes: object = {}): Promise<void> {
  await expect(
    sendAsWorker(app, '/shuttle/vehicles/collected', vehiclesMessage(vehicles, changes)),
  ).resolves.toBeUndefined();
}

// Each vehicle served, as its carid and the name of its stop.
async function carsAtStops(): Promise<string[][]> {
  return (await servedVehicles()).map(({ carId, stop }) => [carId, stop.name]);
}

describe("A User's shuttle route", () => {
  it('serves the stops in loop order at the coordinates of their campus map stops, the route line, and the service hours of the seed', async () => {
    const { stops, line, serviceHours } = await servedRoute();

    expect(stops.map(({ name }) => name)).toEqual(ROUTE_PAGE_STOPS.map(({ name }) => name));
    // 38동 stands at the campus map's 공대입구.
    expect(stops[4]).toMatchObject({ name: '38동', latitude: 37.454964794994, longitude: 126.949840936747 });
    expect(line.length).toBeGreaterThan(100);
    expect(line.at(-1)).toEqual(line[0]);
    // Before any Collection of the route page.
    expect(serviceHours).toBe(SERVICE_HOURS);
  });

  it('refuses a request without an access token', async () => {
    expect((await request(app.getHttpServer()).get('/shuttle')).status).toBe(401);
  });
});

describe("The route page's stops collected by the worker", () => {
  it('give the service hours to serve, and the Collection is recorded', async () => {
    await expect(sendAsWorker(app, '/shuttle/stops/collected', stopsMessage())).resolves.toBeUndefined();

    expect((await servedRoute()).serviceHours).toBe(SERVICE_HOURS);
    expect(await prisma.collectionStatus.findUnique({ where: { source: 'shuttle_stops' } })).toMatchObject({
      lastSucceededAt: new Date('2026-10-02T07:00:00+09:00'),
    });
  });
});

describe('A stop name that the seed does not know', () => {
  it('is refused with the name, nothing is stored, and the failure the worker reports is recorded', async () => {
    await sendAsWorker(app, '/shuttle/stops/collected', stopsMessage({ serviceHours: 'Before' }));
    const renamed = ROUTE_PAGE_STOPS.with(1, { name: '법학관', left: 195, top: 86 });
    const message = stopsMessage({ stops: renamed, collectedAt: '2026-10-03T07:00:00+09:00', serviceHours: 'After' });

    const problem = await refusal(app, '/shuttle/stops/collected', message);
    await sendAsWorker(app, '/collections/failed', {
      source: 'shuttle_stops',
      failedAt: '2026-10-03T07:00:00+09:00',
      reason: `The main server did not take /shuttle/stops/collected: ${problem}`,
    });

    expect(problem).toBe('stops: the seed does not know 법학관');
    expect((await servedRoute()).serviceHours).toBe('Before');
    expect(await prisma.collectionStatus.findUnique({ where: { source: 'shuttle_stops' } })).toMatchObject({
      lastSucceededAt: new Date('2026-10-02T07:00:00+09:00'),
      lastFailedAt: new Date('2026-10-03T07:00:00+09:00'),
      lastFailureReason: 'The main server did not take /shuttle/stops/collected: stops: the seed does not know 법학관',
    });
  });
});

describe('Stops that are not all of the seed in its loop order', () => {
  it.each([
    ['a stop left out', ROUTE_PAGE_STOPS.filter(({ name }) => name !== '경영대')],
    ['two stops swapped', [ROUTE_PAGE_STOPS[1], ROUTE_PAGE_STOPS[0], ...ROUTE_PAGE_STOPS.slice(2)]],
  ])('are refused: %s', async (_, stops) => {
    await sendAsWorker(app, '/shuttle/stops/collected', stopsMessage({ serviceHours: 'Before' }));

    const problem = await refusal(app, '/shuttle/stops/collected', stopsMessage({ stops }));

    expect(problem).toBe(
      `stops: not the seed's stops in its loop order, ${ROUTE_PAGE_STOPS.map(({ name }) => name).join(', ')}`,
    );
    expect((await servedRoute()).serviceHours).toBe('Before');
  });
});

describe('Vehicles collected by the worker', () => {
  it('are stored at the stops their positions are on, and served with the stop and the time received', async () => {
    const receivedAt = new Date().toISOString();
    // As the operator answered on 2026-10-02: three of them at 신소재공동연구소.
    await sendVehicles(
      [
        { carId: '4522', x: 157, y: 40 },
        { carId: '4521', x: 195, y: 294 },
        { carId: '4531', x: 195, y: 294 },
        { carId: '4536', x: 195, y: 294 },
      ],
      { collectedAt: receivedAt },
    );

    const { stops } = await servedRoute();
    const vehicles = await servedVehicles();
    expect(vehicles.map(({ carId, stop }) => [carId, stop])).toEqual([
      ['4522', stops[0]],
      ['4521', stops[5]],
      ['4531', stops[5]],
      ['4536', stops[5]],
    ]);
    expect(vehicles[0]).toMatchObject({ stop: { name: '정문', latitude: 37.4656884925184 }, receivedAt });
    expect(await prisma.collectionStatus.findUnique({ where: { source: 'shuttle_vehicles' } })).toMatchObject({
      lastSucceededAt: new Date(receivedAt),
    });
  });

  it('places a vehicle between two stops at the nearer one', async () => {
    // 31 px below 38동 and 19 px above 신소재공동연구소.
    await sendVehicles([{ carId: '4524', x: 195, y: 270 }]);

    expect(await carsAtStops()).toEqual([['4524', '신소재공동연구소']]);
  });

  it('are served only to a User', async () => {
    expect((await request(app.getHttpServer()).get('/shuttle/vehicles')).status).toBe(401);
  });
});

describe('The vehicles served', () => {
  it('are replaced by the next set, without a vehicle the operator no longer reports', async () => {
    await sendVehicles([
      { carId: '4522', x: 157, y: 40 },
      { carId: '4520', x: 157, y: 398 },
    ]);

    await sendVehicles([{ carId: '4522', x: 195, y: 91 }]);

    expect(await carsAtStops()).toEqual([['4522', '법과대']]);
  });

  it('are no longer served once their positions are more than a minute old', async () => {
    await sendVehicles([{ carId: '4522', x: 157, y: 40 }], {
      collectedAt: new Date(Date.now() - 50_000).toISOString(),
    });
    expect(await carsAtStops()).toEqual([['4522', '정문']]);

    await sendVehicles([{ carId: '4522', x: 157, y: 40 }], {
      collectedAt: new Date(Date.now() - 61_000).toISOString(),
    });
    expect(await servedVehicles()).toEqual([]);
  });

  it('disappear by themselves a minute after their set was received, when no other set arrives', async () => {
    await sendVehicles([{ carId: '4522', x: 157, y: 40 }], {
      collectedAt: new Date(Date.now() - 58_000).toISOString(),
    });
    expect(await carsAtStops()).toEqual([['4522', '정문']]);

    await expect.poll(servedVehicles, { timeout: 5000, interval: 250 }).toEqual([]);
  });

  it('are emptied by a set without vehicles', async () => {
    await sendVehicles([{ carId: '4522', x: 157, y: 40 }]);

    await sendVehicles([]);

    expect(await servedVehicles()).toEqual([]);
  });
});

describe('Each set of vehicles stored', () => {
  it('is sent to the socket server, each vehicle with its stop and the time received', async () => {
    const receivedAt = new Date().toISOString();
    const { stops } = await servedRoute();

    await sendVehicles([{ carId: '4520', x: 157, y: 398 }], { collectedAt: receivedAt });
    await sendVehicles([]);

    await vi.waitFor(() => {
      expect(events.slice(-2)).toEqual([
        { pattern: 'shuttle-vehicles-updated', data: [{ carId: '4520', stop: stops[7], receivedAt }] },
        { pattern: 'shuttle-vehicles-updated', data: [] },
      ]);
    });
  });
});

describe('The places on the drawing that the route page gives', () => {
  afterAll(async () => {
    await sendAsWorker(app, '/shuttle/stops/collected', stopsMessage());
  });

  it('decide the stop a vehicle is placed at', async () => {
    // The operator moves 경영대 on its drawing.
    const moved = ROUTE_PAGE_STOPS.with(13, { name: '경영대', left: 300, top: 500 });
    await sendAsWorker(app, '/shuttle/stops/collected', stopsMessage({ stops: moved }));

    await sendVehicles([{ carId: '4522', x: 300, y: 505 }]);

    expect(await carsAtStops()).toEqual([['4522', '경영대']]);
  });
});

describe('An invalid shuttle message', () => {
  it.each(invalidMessages)('is refused: %s', async (_, pattern, message, problem) => {
    expect(await refusal(app, pattern, message)).toContain(problem);
  });

  it('leaves the vehicles as they were', async () => {
    await sendVehicles([{ carId: '4522', x: 157, y: 40 }]);

    await refusal(app, '/shuttle/vehicles/collected', vehiclesMessage([{ carId: '4520', x: '157', y: 40 }]));

    expect(await carsAtStops()).toEqual([['4522', '정문']]);
  });
});
