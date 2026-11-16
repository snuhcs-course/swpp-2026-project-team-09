/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, screen } from '@testing-library/react-native';
import { TAP_LOOKUPS } from '@/api/mock/data/tap-lookups';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { mapThings } from './support/answer-map';
import { holdBackButton } from './support/back';
import {
  answerBuilding,
  buildingCard,
  GRADUATE_HALL,
  pressBuilding,
  STUDENT_HALL,
  tapGround,
  touchAndLift,
} from './support/building';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ME, ON_CAMPUS, openMain, placeOf } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// A press on a building of the everyday map (P02 ticket 22, board a0), over the fake main server: a tap on the ground
// that no mark takes asks GET /places/at for the position under it and opens the card of the Place there. A mark, a
// face, the User's own dot, a pan, and a pinch are no such press; where no Place is nothing happens.

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

// The Quest the fake main server holds, drawn as a mark at 학생회관.
const DINNER_MARK = '파티 · 저녁 약속';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerBuilding(server, STUDENT_HALL, TAP_LOOKUPS.a1);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function asked(): number {
  return server.received('GET /places/at').length;
}

// Partitions: the point a tap lands on; a Place it is inside, and one it is only near.
describe('a tap on the ground of the everyday map', () => {
  it('asks for the Place at the position under the point, and opens its card', async () => {
    await openMain();
    // The point at which the plain ground draws the User's dot: the touch alone, without the dot's own press.
    const { left, top } = placeOf(ME);

    await tapGround({ x: left, y: top });

    const [{ query }] = server.received('GET /places/at');
    expect(Number(query.latitude)).toBeCloseTo(ON_CAMPUS.latitude, 6);
    expect(Number(query.longitude)).toBeCloseTo(ON_CAMPUS.longitude, 6);
    expect(buildingCard().getByRole('header', { name: '63동' })).toBeVisible();
  });

  it('opens the card of a Place the point is only near', async () => {
    server.on('GET /places/at', { status: 200, body: { place: STUDENT_HALL, relation: 'near' } });
    await openMain();

    await tapGround();

    expect(buildingCard().getByRole('header', { name: '63동' })).toBeVisible();
  });
});

// Partitions: no Place with a card open and without one.
describe('a tap on the ground that opens nothing', () => {
  it('does nothing where no Place is, and leaves an open card as it is', async () => {
    await openMain();
    await tapGround();
    server.on('GET /places/at', { status: 200, body: { place: null, relation: 'none' } });

    await tapGround();

    expect(asked()).toBe(2);
    expect(buildingCard().getByRole('header', { name: '63동' })).toBeVisible();
    expect(server.received('POST /assistant/taps')).toHaveLength(1);
  });

  it('opens nothing where no Place is', async () => {
    server.on('GET /places/at', { status: 200, body: { place: null, relation: 'none' } });
    await openMain();

    await tapGround();

    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

// A touch event with that many fingers on the screen after it, at the ground's point.
function fingers(count: number, at: number): object {
  return {
    nativeEvent: { pageX: 40, pageY: 1200, timestamp: at, touches: Array.from({ length: count }, () => ({})) },
  };
}

// The presses on a building that reached the main server.
function placeTaps(): unknown[] {
  return server
    .received('POST /assistant/taps')
    .map(({ body }) => body)
    .filter((body) => JSON.stringify(body).includes('"place"'));
}

// Partitions: a mark, a Friend's face, and the User's own dot pressed with the touch; a touch that moves; two fingers.
describe('a touch that is no press on a building', () => {
  it.each([
    ['a mark', DINNER_MARK, '저녁 약속'],
    ["a Friend's face", MIN_JUN.name, MIN_JUN.name],
    ["the User's own dot", ME, '지금 친구에게 보이는 나'],
  ])('is %s, whose own press comes after the touch ends and opens its own card', async (_, name, header) => {
    const user = await openMain();

    await touchAndLift();
    await press(user, name);
    await pass(500);

    expect(placeTaps()).toEqual([]);
    expect(buildingCard().getByRole('header', { name: header })).toBeVisible();
  });

  it('moves, as a pan does', async () => {
    await openMain();

    await touchAndLift(undefined, { moved: 80 });
    await pass(500);

    expect(asked()).toBe(0);
  });

  it('is of two fingers, as a pinch is', async () => {
    await openMain();
    const around = screen.getByTestId('main-map-touches');

    await fireEvent(around, 'touchStart', fingers(1, 1000));
    await fireEvent(around, 'touchStart', fingers(2, 1020));
    await fireEvent(around, 'touchEnd', fingers(1, 1080));
    await fireEvent(around, 'touchEnd', fingers(0, 1100));
    await pass(500);

    expect(asked()).toBe(0);
  });
});

// Partitions: the card's ✕ and Android's back.
describe("a building's open card", () => {
  it('closes by its ✕', async () => {
    const user = await openMain();
    await tapGround();

    await user.press(buildingCard().getByRole('button', { name: '닫기' }));

    expect(screen.queryByTestId('map-card')).toBeNull();
  });

  it("closes by Android's back button", async () => {
    const back = holdBackButton();
    await openMain();
    await tapGround();

    expect(await back()).toBe(true);

    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

// Partitions: another building and a face pressed under the card; what stays on the map.
describe("what a building's open card leaves to the map", () => {
  it('gives way to the card of another building pressed under it', async () => {
    await openMain();
    await tapGround();

    await pressBuilding(server, GRADUATE_HALL, TAP_LOOKUPS.a3);

    expect(buildingCard().getByRole('header', { name: '39동' })).toBeVisible();
    expect(server.received('POST /assistant/taps').at(-1)?.body).toEqual({
      tapped: { kind: 'place', placeId: GRADUATE_HALL.id },
      location: ON_CAMPUS,
    });
  });

  it("gives way to the card of a Friend's face pressed under it", async () => {
    const user = await openMain();
    await tapGround();

    await press(user, MIN_JUN.name);

    expect(buildingCard().getByRole('header', { name: MIN_JUN.name })).toBeVisible();
  });

  it("moves no camera, keeps every Friend's face, and marks the Place", async () => {
    await openMain();
    const before = { at: placeOf(ME), things: mapThings() };

    await tapGround();

    expect(buildingCard().getByRole('header', { name: '63동' })).toBeVisible();
    expect(placeOf(ME)).toEqual(before.at);
    expect(mapThings()).toEqual([...before.things, '63동'].toSorted());
  });
});
