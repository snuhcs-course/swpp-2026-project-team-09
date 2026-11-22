/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import type { MapScene } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { color } from '@/design-system';
import { apiClient } from '@/api/client';
import { WALKS_PER_SCENE } from '@/screens/main/use-answer-walks';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap, mapLines } from './support/answer-map';
import type { FakeServer, Received, Reply } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// An answer's walking routes follow the paths (P15 ticket 56), against the fake main server: the walks of the Plan on
// screen are asked of `GET /walking-route`, a few at most, and drawn along the line it gives, and stay straight when
// none comes. Nothing is kept: a Plan that leaves the screen gives its requests up, and one shown again asks again.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

const WALKING_ROUTE = 'GET /walking-route';
// The first Plan's two walks: the User's way to 302동식당, and on to the 13:00 Class at 24동.
const RESTAURANT = { latitude: 37.44887, longitude: 126.95265 };
const CLASS = { latitude: 37.45942, longitude: 126.94989 };
// Where the third Plan's User walks: 학생회관식당.
const STUDENT_HALL = { latitude: 37.45932, longitude: 126.95058 };

let server: FakeServer;

let findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The style of each stroke of a line on the plain ground: a solid line draws one stroke between each two points.
function strokesOf(id: string): ViewStyle[] {
  return within(screen.getByTestId(`line:${id}`))
    .getAllByTestId('route-stroke')
    .map((stroke) => {
      const style: unknown = stroke.props.style;
      return StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
    });
}

function endsAt(request: Received, to: { latitude: number; longitude: number }): boolean {
  return Number(request.query.endLatitude) === to.latitude && Number(request.query.endLongitude) === to.longitude;
}

// A path of four points from the request's start to its end, with two bends between.
function pathOf(request: Received, afterMs?: number): Reply {
  const start = { latitude: Number(request.query.startLatitude), longitude: Number(request.query.startLongitude) };
  const end = { latitude: Number(request.query.endLatitude), longitude: Number(request.query.endLongitude) };
  const bend = (share: number): { latitude: number; longitude: number } => ({
    latitude: start.latitude + (end.latitude - start.latitude) * share + 0.0003,
    longitude: start.longitude + (end.longitude - start.longitude) * share,
  });
  const line = [start, bend(1 / 3), bend(2 / 3), end];
  return { status: 200, body: { status: 'OK', route: { line, distance: 300, duration: 240 } }, afterMs };
}

// Partitions: a path found for the User's walk, the request failing, no path found.
describe("an answer's walks", () => {
  it("draws the User's walk along the path the service found, in the line's own colour and width", async () => {
    server.on(WALKING_ROUTE, (request) =>
      endsAt(request, RESTAURANT) ? pathOf(request) : { status: 200, body: { status: 'TOO_FAR_AWAY', route: null } },
    );
    await askOnMap(server, MEAL_ANSWER_REPLY);
    await pass(500);

    expect(mapLines()).toEqual(['answer:route:0', 'answer:route:1']);
    expect(strokesOf('answer:route:0')).toEqual(
      Array.from({ length: 3 }, (): unknown => expect.objectContaining({ height: 5, backgroundColor: color.snuBlue })),
    );
    expect(strokesOf('answer:route:1')).toHaveLength(1);
  });

  it('keeps the straight line when the request fails', async () => {
    server.on(WALKING_ROUTE, { status: 500, body: { statusCode: 500, message: 'Internal Server Error' } });
    await askOnMap(server, MEAL_ANSWER_REPLY);
    await pass(3000);

    expect(server.received(WALKING_ROUTE).some((request) => endsAt(request, RESTAURANT))).toBe(true);
    expect(strokesOf('answer:route:0')).toEqual([
      expect.objectContaining({ height: 5, backgroundColor: color.snuBlue }),
    ]);
  });

  it('keeps the straight line when no path is found', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);
    await pass(500);

    expect(server.received(WALKING_ROUTE).some((request) => endsAt(request, CLASS))).toBe(true);
    expect(strokesOf('answer:route:0')).toHaveLength(1);
    expect(strokesOf('answer:route:1')).toHaveLength(1);
  });
});

type Route = MapScene['routes'][number];

// The stored reply with its first Plan's routes replaced.
function replyWithRoutes(routes: Route[]): object {
  const [first, ...rest] = MEAL_ANSWER_REPLY.answer.plans;
  if (first === undefined) {
    throw new Error('The stored answer has no Plan');
  }
  const plans = [{ ...first, scene: { ...first.scene, routes } }, ...rest];
  return { ...MEAL_ANSWER_REPLY, answer: { ...MEAL_ANSWER_REPLY.answer, plans } };
}

const [MINE] = MEAL_ANSWER_REPLY.answer.plans[0]?.scene.routes ?? [];
if (MINE === undefined) {
  throw new Error('The stored answer has no route');
}
const MY_WALK: Route = MINE;

// Five walks of the User's from the same start to five ends, 100 metres apart northwards.
const FIVE = Array.from({ length: 5 }, (_, at) => ({
  ...MY_WALK,
  to: { latitude: RESTAURANT.latitude + at * 0.001, longitude: RESTAURANT.longitude },
}));

function askedFor(walks: readonly Route[]): Received[] {
  return server.received(WALKING_ROUTE).filter((request) => walks.some(({ to }) => endsAt(request, to)));
}

// Partitions: more walks than are asked for, two walks of the same ends, a shuttle's ride; a failure among them.
// Expected values: `WALKS_PER_SCENE` requests in the scene's order, one for both walks of the same ends, none for the
// ride, and the walks that were found drawn whatever the others did.
describe('how many walks are asked', () => {
  it('asks the first few walks once each, never a shuttle ride, and keeps the rest straight', async () => {
    server.on(WALKING_ROUTE, (request) => pathOf(request));
    const ride: Route = { ...MY_WALK, to: CLASS, mode: 'shuttle' };
    const again: Route = { ...MY_WALK, role: 'friend' };
    await askOnMap(server, replyWithRoutes([FIVE[0] ?? MY_WALK, again, ...FIVE.slice(1), ride]));
    await pass(500);

    expect(askedFor(FIVE)).toHaveLength(WALKS_PER_SCENE);
    expect(askedFor(FIVE.slice(0, 1))).toHaveLength(1);
    expect(server.received(WALKING_ROUTE).some((request) => endsAt(request, CLASS))).toBe(false);
    expect(strokesOf('answer:route:0')).toHaveLength(3);
    expect(strokesOf('answer:route:1')).toHaveLength(3);
    expect(strokesOf('answer:route:4')).toHaveLength(1);
    expect(strokesOf('answer:route:6')).toHaveLength(1);
  });

  it('draws the walks that were found when another fails', async () => {
    server.on(WALKING_ROUTE, (request) =>
      endsAt(request, FIVE[1]?.to ?? CLASS) ? { status: 500, body: { statusCode: 500 } } : pathOf(request),
    );
    await askOnMap(server, replyWithRoutes(FIVE.slice(0, 3)));
    await pass(3000);

    expect(strokesOf('answer:route:0')).toHaveLength(3);
    expect(strokesOf('answer:route:1')).toHaveLength(1);
    expect(strokesOf('answer:route:2')).toHaveLength(3);
  });
});

type Point = { latitude: number; longitude: number };

// The first Plan's walks and the third Plan's, each from its start to its end.
const PLAN_1_WALKS: [Point, Point][] = [
  [MY_WALK.from, RESTAURANT],
  [RESTAURANT, CLASS],
];
const PLAN_3_WALKS: [Point, Point][] = [
  [RESTAURANT, MY_WALK.from],
  [MY_WALK.from, STUDENT_HALL],
  [STUDENT_HALL, CLASS],
];

function same(one: Point, other: Point): boolean {
  return one.latitude === other.latitude && one.longitude === other.longitude;
}

// The signals the requests for these walks were asked with, in the order they were asked.
function signalsOf(walks: readonly [Point, Point][]): (AbortSignal | undefined)[] {
  return findWalkingRoute.mock.calls
    .filter(([from, to]) => walks.some(([start, end]) => same(start, from) && same(end, to)))
    .map(([, , signal]) => signal);
}

// Partitions: a Plan that leaves the screen while its walks are on their way, and one shown again after its walks
// were answered.
describe('a Plan that leaves the screen', () => {
  it("gives up its walks' requests still on their way", async () => {
    server.on(WALKING_ROUTE, (request) => pathOf(request, 5000));
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(screen.getByRole('button', { name: '후보 3 · 학생회관식당 · 12:33' }));
    await pass(500);

    // The first Plan's two walks were given up; the third Plan's three are on their way.
    expect(signalsOf(PLAN_1_WALKS).map((signal) => signal?.aborted)).toEqual([true, true]);
    expect(signalsOf(PLAN_3_WALKS).map((signal) => signal?.aborted)).toEqual([false, false, false]);
  });

  it('keeps nothing: shown again, it asks again', async () => {
    server.on(WALKING_ROUTE, (request) => pathOf(request));
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await pass(500);

    await user.press(screen.getByRole('button', { name: '후보 3 · 학생회관식당 · 12:33' }));
    await pass(500);
    await user.press(screen.getByRole('button', { name: '후보 1 · 302동식당 · 12:15' }));
    await pass(500);

    expect(server.received(WALKING_ROUTE).filter((request) => endsAt(request, RESTAURANT))).toHaveLength(2);
    expect(strokesOf('answer:route:0')).toHaveLength(3);
  });
});
