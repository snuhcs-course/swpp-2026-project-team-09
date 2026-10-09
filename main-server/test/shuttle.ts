// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #31
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';

// The operator's stops in loop order with their places on the drawing, as the route page of 2026-10-02 lists them.
export const ROUTE_PAGE_STOPS = [
  { name: '정문', left: 157, top: 35 },
  { name: '법과대', left: 195, top: 86 },
  { name: '자연대', left: 195, top: 136 },
  { name: '농생대', left: 195, top: 188 },
  { name: '38동', left: 195, top: 239 },
  { name: '신소재공동연구소', left: 195, top: 289 },
  { name: '302동', left: 195, top: 341 },
  { name: '301동', left: 157, top: 393 },
  { name: '유전공학연구소', left: 116, top: 341 },
  { name: '교수회관', left: 116, top: 289 },
  { name: '기숙사삼거리', left: 116, top: 239 },
  { name: '국제대학원', left: 116, top: 188 },
  { name: '수의대', left: 116, top: 136 },
  { name: '경영대', left: 116, top: 86 },
];

// The route page's service hours, as the worker reads them.
export const SERVICE_HOURS = [
  '· 운행시간 안내(주말,공휴일,개교기념일 미운행)',
  '-  학기 8:00~21:00 / 계절학기, 방학 8:00~18:00',
  '※ 학기 8:00~19:00 (5~7분), 19:00~21:00 (20분 간격)',
  '※ 계절학기 5~7분 간격 / 방학 10분 간격',
].join('\n');

// A message of the route page's Collection, with `changes` applied.
export function stopsMessage(changes: object = {}): object {
  return {
    source: 'shuttle_stops',
    collectedAt: '2026-10-02T07:00:00+09:00',
    stops: ROUTE_PAGE_STOPS,
    serviceHours: SERVICE_HOURS,
    ...changes,
  };
}

// A message of the vehicle positions' Collection, received now unless `changes` says otherwise.
export function vehiclesMessage(vehicles: object[], changes: object = {}): object {
  return { source: 'shuttle_vehicles', collectedAt: new Date().toISOString(), vehicles, ...changes };
}

// Each with the path it is posted to and the start of the problem the answer names.
export const invalidMessages: [string, string, object, string][] = [
  [
    'a vehicle without its carid',
    '/shuttle/vehicles/collected',
    vehiclesMessage([{ x: 157, y: 40 }]),
    'vehicles.0.carId: ',
  ],
  [
    'a position that is not a number',
    '/shuttle/vehicles/collected',
    vehiclesMessage([{ carId: '4522', x: '157', y: 40 }]),
    'vehicles.0.x: ',
  ],
  [
    'a vehicle listed twice',
    '/shuttle/vehicles/collected',
    vehiclesMessage([
      { carId: '4522', x: 157, y: 40 },
      { carId: '4522', x: 195, y: 91 },
    ]),
    'vehicles: Each vehicle must appear once',
  ],
  [
    "vehicles under the route page's Source",
    '/shuttle/vehicles/collected',
    vehiclesMessage([], { source: 'shuttle_stops' }),
    'source: ',
  ],
  [
    'a time without an offset',
    '/shuttle/vehicles/collected',
    vehiclesMessage([], { collectedAt: '2026-10-02T15:40:07' }),
    'collectedAt: ',
  ],
  [
    'a stop without its place on the drawing',
    '/shuttle/stops/collected',
    stopsMessage({ stops: [{ name: '정문', left: 157 }] }),
    'stops.0.top: ',
  ],
  ['no service hours', '/shuttle/stops/collected', stopsMessage({ serviceHours: '' }), 'serviceHours: '],
  ['an unknown field', '/shuttle/stops/collected', stopsMessage({ vehicles: 6 }), 'Unrecognized key: "vehicles"'],
];

const stopSchema = z.strictObject({ id: z.uuid(), name: z.string(), latitude: z.number(), longitude: z.number() });

// The answer of GET /shuttle, exactly.
export const routeSchema = z.strictObject({
  serviceHours: z.string(),
  stops: z.array(stopSchema),
  line: z.array(z.strictObject({ latitude: z.number(), longitude: z.number() })),
});

// The answer of GET /shuttle/vehicles, exactly. No field says that a position is estimated.
export const vehiclesSchema = z.array(
  z.strictObject({ carId: z.string(), stop: stopSchema, receivedAt: z.iso.datetime() }),
);

export function getAsUser(app: INestApplication<Server>, accessToken: string, path: string): request.Test {
  return request(app.getHttpServer()).get(path).auth(accessToken, { type: 'bearer' });
}
