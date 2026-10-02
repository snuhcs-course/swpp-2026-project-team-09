import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';
import {
  between,
  CENTRAL_LIBRARY,
  getWalkingRoute,
  KakaoStub,
  MAIN_GATE,
  MAIN_GATE_TO_CENTRAL_LIBRARY,
  savedAnswer,
} from './walking-route.js';

const settings = inject('settings');
const kakao = new KakaoStub();
let app: INestApplication<Server>;
let accessToken: string;

beforeAll(async () => {
  app = await startApp(settings, [], kakao.fetch);
  ({ accessToken } = await signIn(app));
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  kakao.reset();
});

// The walk of the real call and Kakao's answers to the two real calls.
const walk = between(MAIN_GATE, CENTRAL_LIBRARY);
const route = savedAnswer('kakao-walk-main-gate-to-central-library-2026-10-02');
const samePoint = savedAnswer('kakao-walk-same-point-2026-10-02');

describe('A walking route between two points', () => {
  it("is Kakao's line from the start to the end, with the distance in metres and the duration in seconds", async () => {
    kakao.answers(route);

    const response = await getWalkingRoute(app, accessToken, walk);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'OK',
      route: { line: MAIN_GATE_TO_CENTRAL_LIBRARY, distance: 1105, duration: 1216 },
    });
  });

  it("asks Kakao once, with the longitudes as x, the latitudes as y and the server's key", async () => {
    kakao.answers(route);

    await getWalkingRoute(app, accessToken, walk);

    expect(kakao.requests).toEqual([
      {
        url: 'https://dapi.kakao.com/v2/routing/walk?start_x=126.9486&start_y=37.4664&end_x=126.9524&end_y=37.4592',
        authorization: `KakaoAK ${settings.KAKAO_REST_API_KEY}`,
      },
    ]);
  });
});

describe('A walking route Kakao does not find', () => {
  it('is answered as no route, with the status Kakao gave', async () => {
    kakao.answers(samePoint);

    const response = await getWalkingRoute(app, accessToken, between(MAIN_GATE, MAIN_GATE));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'SAME_POINT', route: null });
  });

  // Not met in a real call: the saved answer of SAME_POINT, with the status changed.
  it.each([
    'START_LINK_NOT_FOUND',
    'END_LINK_NOT_FOUND',
    'TOO_MANY_SEARCH_LINK',
    'TOO_FAR_AWAY',
    'ROUTE_RESULT_NOT_FOUND',
  ])('is answered as no route when Kakao answers %s', async (status) => {
    kakao.answers(samePoint.replace('"SAME_POINT"', `"${status}"`));

    const response = await getWalkingRoute(app, accessToken, walk);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status, route: null });
  });
});

const failed = { statusCode: 502, error: 'Bad Gateway', message: "Kakao's walking route API failed" };

// No real call met these. The errors are shaped after Kakao's documentation (external-sources.md §7.5).
const notRoutes: [string, number, string][] = [
  ['the quota is used up', 429, '{"code":-10,"msg":"API limit has been exceeded."}'],
  ['the key is refused', 401, '{"code":-401,"msg":"ip mismatched"}'],
  ['a status that is not one of its own', 200, samePoint.replace('"SAME_POINT"', '"NOT_A_STATUS"')],
  ['a page instead of an answer', 503, '<html><body>Service Unavailable</body></html>'],
];

describe('An answer of Kakao that is neither a route nor no route', () => {
  it.each(notRoutes)('is answered 502 when %s', async (_problem, status, body) => {
    kakao.answers(body, status);

    const response = await getWalkingRoute(app, accessToken, walk);

    expect(response.status).toBe(502);
    expect(response.body).toEqual(failed);
  });

  it('is answered 502 when Kakao cannot be reached', async () => {
    kakao.fails(new TypeError('fetch failed'));

    const response = await getWalkingRoute(app, accessToken, walk);

    expect(response.status).toBe(502);
    expect(response.body).toEqual(failed);
  });
});

describe('A walking route asked for again', () => {
  it('is asked of Kakao again, since nothing keeps a route', async () => {
    kakao.answers(route);

    await getWalkingRoute(app, accessToken, walk);
    await getWalkingRoute(app, accessToken, walk);

    expect(kakao.requests).toHaveLength(2);
  });

  it('is answered with a header that tells every HTTP cache not to keep it', async () => {
    kakao.answers(route);

    const response = await getWalkingRoute(app, accessToken, walk);

    expect(response.headers['cache-control']).toBe('no-store');
  });
});

// The problem, the query and the field the answer names.
const invalidCoordinates: [string, Record<string, string | number | undefined>, string][] = [
  ['no latitude of the start', { ...walk, startLatitude: undefined }, 'startLatitude: '],
  ['a longitude that is not a number', { ...walk, endLongitude: '126.9524E' }, 'endLongitude: '],
  ['an empty latitude', { ...walk, endLatitude: '' }, 'endLatitude: '],
  [
    'the latitude and the longitude swapped',
    { ...walk, startLatitude: 126.9486, startLongitude: 37.4664 },
    'startLatitude: ',
  ],
  ['a longitude past 180°', { ...walk, endLongitude: 180.5 }, 'endLongitude: '],
];

describe("A User's walking route", () => {
  it('refuses a request without an access token, and asks Kakao nothing', async () => {
    const response = await getWalkingRoute(app, undefined, walk);

    expect(response.status).toBe(401);
    expect(kakao.requests).toEqual([]);
  });

  it.each(invalidCoordinates)(
    'answers 400 to %s, names the field and asks Kakao nothing',
    async (_problem, query, field) => {
      const response = await getWalkingRoute(app, accessToken, query);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ message: [expect.stringContaining(field)] });
      expect(kakao.requests).toEqual([]);
    },
  );
});
