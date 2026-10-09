// AI-generated with Claude Opus 5.5, 2026-10-02, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #28
import { INestApplication, Logger } from '@nestjs/common';
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
const routeAnswer = savedAnswer('kakao-walk-main-gate-to-central-library-2026-10-02');
const samePointAnswer = savedAnswer('kakao-walk-same-point-2026-10-02');

describe('A walking route between two points', () => {
  it("is Kakao's line from the start to the end, with the distance in metres and the duration in seconds", async () => {
    kakao.answers(routeAnswer);

    const response = await getWalkingRoute(app, accessToken, walk);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'OK',
      route: { line: MAIN_GATE_TO_CENTRAL_LIBRARY, distance: 1105, duration: 1216 },
    });
  });

  it("asks Kakao once, with the longitudes as x, the latitudes as y and the server's key", async () => {
    kakao.answers(routeAnswer);

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
    kakao.answers(samePointAnswer);

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
    kakao.answers(samePointAnswer.replace('"SAME_POINT"', `"${status}"`));

    const response = await getWalkingRoute(app, accessToken, walk);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status, route: null });
  });
});

const failed = { statusCode: 502, error: 'Bad Gateway', message: "Kakao's walking route API failed." };

// No real call met these. The errors are shaped after Kakao's documentation (external-sources.md §7.5). The problem,
// the HTTP status, the answer and what the log says of it.
const otherAnswers: [string, number, string, string][] = [
  ['the quota is used up', 429, '{"code":-10,"msg":"API limit has been exceeded."}', 'HTTP 429 {"code":-10}'],
  ['the key is refused', 401, '{"code":-401,"msg":"ip mismatched"}', 'HTTP 401 {"code":-401}'],
  [
    'a status that is not one of its own',
    200,
    samePointAnswer.replace('"SAME_POINT"', '"NOT_A_STATUS"'),
    'HTTP 200 {"status":"NOT_A_STATUS"}',
  ],
  [
    'a route it cannot read',
    200,
    routeAnswer.replace('"totalTime":1216', '"totalTime":"1216"'),
    'HTTP 200 {"status":"OK"}',
  ],
  ['a page instead of an answer', 503, '<html><body>Service Unavailable</body></html>', 'HTTP 503 {}'],
];

describe('An answer of Kakao that is neither a route nor no route', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(otherAnswers)(
    'is answered 502 when %s, and logged without a route or a point',
    async (_problem, status, body, logged) => {
      const warn = vi.spyOn(Logger.prototype, 'warn');
      kakao.answers(body, status);

      const response = await getWalkingRoute(app, accessToken, walk);

      expect(response.status).toBe(502);
      expect(response.body).toEqual(failed);
      expect(warn).toHaveBeenCalledWith(`Kakao's walking route API failed: ${logged}`);
    },
  );

  it('is answered 502 when Kakao cannot be reached, and logged with the reason', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn');
    kakao.fails(new TypeError('fetch failed'));

    const response = await getWalkingRoute(app, accessToken, walk);

    expect(response.status).toBe(502);
    expect(response.body).toEqual(failed);
    expect(warn).toHaveBeenCalledWith("Kakao's walking route API failed: TypeError: fetch failed");
  });

  it('is answered 502 when Kakao has not answered within 5 seconds, and logged with the reason', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn');
    // The test waits 10 ms in place of the 5 seconds.
    const timeoutAfter = AbortSignal.timeout.bind(AbortSignal);
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => timeoutAfter(10));
    kakao.hangs();

    const response = await getWalkingRoute(app, accessToken, walk);

    expect(timeout).toHaveBeenCalledWith(5000);
    expect(response.status).toBe(502);
    expect(response.body).toEqual(failed);
    expect(warn).toHaveBeenCalledWith(
      "Kakao's walking route API failed: TimeoutError: The operation was aborted due to timeout",
    );
  });
});

describe('A walking route asked for again', () => {
  it('is asked of Kakao again, since nothing keeps a route', async () => {
    kakao.answers(routeAnswer);

    await getWalkingRoute(app, accessToken, walk);
    await getWalkingRoute(app, accessToken, walk);

    expect(kakao.requests).toHaveLength(2);
  });

  it('is answered with a header that tells every HTTP cache not to keep it', async () => {
    kakao.answers(routeAnswer);

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
