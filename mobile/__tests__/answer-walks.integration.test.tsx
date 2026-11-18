/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import type { MapScene } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { color } from '@/design-system';
import { WALKS_AT_ONCE } from '@/screens/main/use-answer-walks';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap, mapLines } from './support/answer-map';
import type { FakeServer, Received, Reply } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// An answer's walking routes follow the paths (P15 ticket 56), against the fake main server: each walk of the Plan on
// screen is asked of `GET /walking-route` and drawn along the line it gives, and stays straight when none comes.

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

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
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

// Partitions: more walks than are asked at once, and a shuttle's ride. Expected values: `WALKS_AT_ONCE` requests
// while the first wait, every walk once all are answered, and no request for the ride.
describe('how many walks are asked', () => {
  const [mine] = MEAL_ANSWER_REPLY.answer.plans[0]?.scene.routes ?? [];
  if (mine === undefined) {
    throw new Error('The stored answer has no route');
  }
  const walks = Array.from({ length: 5 }, (_, at) => ({
    ...mine,
    to: { latitude: RESTAURANT.latitude + at * 0.001, longitude: RESTAURANT.longitude },
  }));
  const ride: Route = { ...mine, to: CLASS, mode: 'shuttle' };

  function asked(): Received[] {
    return server.received(WALKING_ROUTE).filter((request) => walks.some(({ to }) => endsAt(request, to)));
  }

  it('asks at most a few at once, every walk in the end, and never a shuttle ride', async () => {
    server.on(WALKING_ROUTE, (request) => pathOf(request, 1000));
    await askOnMap(server, replyWithRoutes([...walks, ride]));

    expect(asked()).toHaveLength(WALKS_AT_ONCE);

    await pass(3000);

    expect(asked()).toHaveLength(walks.length);
    expect(server.received(WALKING_ROUTE).some((request) => endsAt(request, CLASS))).toBe(false);
  });
});
