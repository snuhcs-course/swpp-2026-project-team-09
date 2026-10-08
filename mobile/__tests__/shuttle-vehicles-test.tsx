import { StyleSheet, type ViewStyle } from 'react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { socketServer } from './support/live';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import {
  answerShuttle,
  GATE,
  LAW,
  SCIENCE,
  stopMarker,
  toggleShuttle,
  vehicle,
  vehicleMarker,
} from './support/shuttle';

// The shuttle's vehicles on the map as sets of them arrive, against the fake main server and the fake socket server.
// The phone does not ask for less motion unless a test says so.

let mockMotion = true;

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => !mockMotion,
  useMotionAllowed: (): boolean => mockMotion,
  useReduceMotionSetting: (): boolean => !mockMotion,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

const VEHICLE = /^셔틀버스 · 운행 중/u;

let server: FakeServer;

beforeEach(async () => {
  mockMotion = true;
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerShuttle(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// The main screen with its connection open and the shuttle layer on.
async function openShuttle(): Promise<User> {
  const user = await openMain();
  await socketServer((socket) => {
    socket.accept();
  });
  await toggleShuttle(user);
  return user;
}

async function sendSet(...vehicles: Parameters<typeof vehicle>[]): Promise<void> {
  await socketServer((socket) => {
    socket.send(
      'shuttle-vehicles-updated',
      vehicles.map((args) => vehicle(...args)),
    );
  });
}

// Where the plain ground puts a marker: the place it glides to. A stop's pin and a vehicle's have the same size.
function placeOf(name: string | RegExp): { x: number; y: number } {
  const style: unknown = screen.getByLabelText(name).parent?.props.style;
  const { left, top } = StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
  return { x: Number(left), y: Number(top) };
}

function vehicleCount(): number {
  return screen.queryAllByLabelText(VEHICLE).length;
}

describe('a vehicle', () => {
  it('is placed at its stop when it is first seen', async () => {
    await openShuttle();

    expect(placeOf(vehicleMarker(GATE))).toEqual(placeOf(stopMarker(GATE)));
    // A pin over the stop's dot, so that it is seen.
    expect(screen.getByRole('button', { name: vehicleMarker(GATE) })).toHaveProp('testID', 'shuttle:pin');
  });

  it('travels to a new stop along the line in 10 seconds, through its bend', async () => {
    await openShuttle();
    const [gate, law] = [placeOf(stopMarker(GATE)), placeOf(stopMarker(LAW))];

    await sendSet(['4522', LAW]);
    // On the side east from 정문.
    const first = placeOf(VEHICLE);
    expect(first.y).toBeCloseTo(gate.y, 3);
    expect(first.x).toBeGreaterThan(gate.x);
    expect(first.x).toBeLessThan(law.x);

    await pass(5000);
    // Past the corner, on the side south to 법과대.
    const half = placeOf(VEHICLE);
    expect(half.x).toBeCloseTo(law.x, 3);
    expect(half.y).toBeGreaterThan(gate.y);
    expect(half.y).toBeLessThan(law.y);

    await pass(5000);
    expect(placeOf(VEHICLE)).toEqual(law);
  });
});

describe('a vehicle reported further on', () => {
  it('passes the stops skipped between two sets in the same 10 seconds', async () => {
    await openShuttle();
    const law = placeOf(stopMarker(LAW));

    await sendSet(['4522', SCIENCE]);
    await pass(5000);
    expect(placeOf(VEHICLE).x).toBeCloseTo(law.x, 3);

    await pass(5000);
    expect(placeOf(VEHICLE)).toEqual(placeOf(stopMarker(SCIENCE)));
  });

  it('is placed at once at a stop behind the last one', async () => {
    answerShuttle(server, [vehicle('4522', SCIENCE, PHONE_NOW)]);
    await openShuttle();

    await sendSet(['4522', LAW]);

    expect(placeOf(VEHICLE)).toEqual(placeOf(stopMarker(LAW)));
  });

  it('is placed at once where the phone asks for less motion', async () => {
    mockMotion = false;
    await openShuttle();

    await sendSet(['4522', LAW]);

    expect(placeOf(VEHICLE)).toEqual(placeOf(stopMarker(LAW)));
  });
});

describe('the vehicles that are removed', () => {
  it('a vehicle missing from a newer set goes at once', async () => {
    answerShuttle(server, [vehicle('4522', GATE, PHONE_NOW), vehicle('4523', SCIENCE, PHONE_NOW)]);
    await openShuttle();
    expect(vehicleCount()).toBe(2);

    await sendSet(['4523', SCIENCE]);

    expect(vehicleCount()).toBe(1);
    expect(screen.getByLabelText(vehicleMarker(SCIENCE))).toBeVisible();
  });

  it('a vehicle goes when its report is more than a minute old and no set came', async () => {
    await openShuttle();
    const since = Date.now() - PHONE_NOW.getTime();

    await pass(59_000 - since);
    expect(vehicleCount()).toBe(1);

    await pass(7000);
    expect(vehicleCount()).toBe(0);
  });
});

describe('the sets of vehicles', () => {
  it('are dropped while the layer is off', async () => {
    server.on('GET /shuttle/vehicles', refusal(500));
    const user = await openMain();
    await socketServer((socket) => {
      socket.accept();
    });

    await sendSet(['4522', LAW]);
    await toggleShuttle(user);
    await pass(1500);

    expect(screen.getByLabelText(stopMarker(LAW))).toBeVisible();
    expect(vehicleCount()).toBe(0);
  });

  it('are fetched again when the connection opens again while the layer is on, and not while it is off', async () => {
    const user = await openShuttle();
    expect(server.received('GET /shuttle/vehicles')).toHaveLength(1);

    await socketServer((socket) => {
      socket.accept();
    });
    expect(server.received('GET /shuttle/vehicles')).toHaveLength(2);

    await toggleShuttle(user);
    await socketServer((socket) => {
      socket.accept();
    });
    expect(server.received('GET /shuttle/vehicles')).toHaveLength(2);
  });
});
