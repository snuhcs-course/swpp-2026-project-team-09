import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { findButton } from './support/lists';
import { socketServer } from './support/live';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { CLOSER, press, wordsUnder, zoomIn } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import {
  AGRICULTURE,
  answerShuttle,
  GATE,
  inView,
  LAW,
  lineDashes,
  openLiveMain,
  SCIENCE,
  SERVICE_HOURS,
  shown,
  stopMarker,
  toggleShuttle,
  vehicle,
  vehicleMarker,
} from './support/shuttle';

// The shuttle layer of the `Main` frame, its cards and its notice outside the service hours, against the fake main
// server and the fake socket server, on a phone that asks for less motion.

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

const FAILED = '셔틀버스 정보를 불러오지 못했어요';
const NOT_IN_SERVICE = '지금은 셔틀버스가 운행하지 않아요';
const STOPS = [GATE, LAW, SCIENCE, AGRICULTURE];

let server: FakeServer;

async function start(now: Date = PHONE_NOW): Promise<void> {
  jest.useFakeTimers({ now });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerShuttle(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
}

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the shuttle layer', () => {
  beforeEach(async () => {
    await start();
  });

  it('asks for the route and the vehicles once when it is turned on, and again when it is turned on again', async () => {
    const user = await openMain();
    expect(server.received('GET /shuttle')).toHaveLength(0);

    await toggleShuttle(user);
    expect(server.received('GET /shuttle')).toHaveLength(1);
    expect(server.received('GET /shuttle/vehicles')).toHaveLength(1);

    await toggleShuttle(user);
    await toggleShuttle(user);
    expect(server.received('GET /shuttle')).toHaveLength(2);
    expect(server.received('GET /shuttle/vehicles')).toHaveLength(2);
  });

  it('draws the line purple, 3 wide, dashed 8 and 6', async () => {
    const user = await openMain();

    await toggleShuttle(user);

    const dashes = lineDashes();
    // Four sides of about 442 m, a dash of 8 every 14 points.
    expect(dashes.length).toBeGreaterThan(40);
    expect(dashes[0]).toHaveStyle({ width: 11, height: 3, backgroundColor: '#6B46C1' });
  });

  it("puts a dot on each stop, in the shuttle's look, without the stop's name under it at any level", async () => {
    const user = await openMain();
    await toggleShuttle(user);
    for (const stop of STOPS) {
      expect(screen.getByRole('button', { name: stopMarker(stop) })).toHaveProp('testID', 'shuttle:dot');
    }
    expect(wordsUnder(stopMarker(SCIENCE), '자연대')).toBeNull();

    await zoomIn(user, 3);

    expect(wordsUnder(stopMarker(SCIENCE), '자연대')).toBeNull();
  });
});

describe('the shuttle layer without an answer, and turned off', () => {
  beforeEach(async () => {
    await start();
  });

  it('shows nothing and says so when the route cannot be fetched', async () => {
    server.on('GET /shuttle', refusal(500));
    const user = await openMain();

    await toggleShuttle(user);
    await pass(1500);

    expect(screen.getByText(FAILED)).toBeVisible();
    expect(lineDashes()).toHaveLength(0);
    expect(shown(stopMarker(GATE))).toBe(false);
    expect(shown(vehicleMarker(GATE))).toBe(false);
  });

  it('keeps the line and the stops when only the vehicles cannot be fetched, until the next set brings them', async () => {
    server.on('GET /shuttle/vehicles', refusal(500));
    const user = await openLiveMain();

    await toggleShuttle(user);
    await pass(1500);
    expect(screen.queryByText(FAILED)).toBeNull();
    expect(lineDashes().length).toBeGreaterThan(0);
    expect(shown(stopMarker(GATE))).toBe(true);
    expect(shown(vehicleMarker(GATE))).toBe(false);

    await socketServer((socket) => {
      socket.send('shuttle-vehicles-updated', [vehicle('4522', LAW)]);
    });
    expect(shown(vehicleMarker(LAW))).toBe(true);
  });

  it('takes the line, the stops and the vehicles away when it is turned off', async () => {
    const user = await openMain();
    await toggleShuttle(user);
    expect(shown(vehicleMarker(GATE))).toBe(true);

    await toggleShuttle(user);

    expect(lineDashes()).toHaveLength(0);
    expect(shown(stopMarker(LAW))).toBe(false);
    expect(shown(vehicleMarker(GATE))).toBe(false);
  });
});

describe("a stop's card", () => {
  beforeEach(async () => {
    await start();
  });

  it('names a stop and the next one, with no button but "가까이 보기"', async () => {
    const user = await openMain();
    await toggleShuttle(user);

    await press(user, stopMarker(AGRICULTURE));

    expect(screen.getByTestId('map-card')).toHaveTextContent(
      '셔틀버스 · 교내 순환농생대 정류장다음 정류장 정문가까이 보기',
    );
    expect(screen.getByText('셔틀버스 · 교내 순환')).toHaveStyle({ color: '#6B46C1' });
    expect(findButton('노선 보기')).toBeNull();
  });
});

describe("a vehicle's card", () => {
  beforeEach(async () => {
    await start();
  });

  it('names where a vehicle is, and changes as a set moves it', async () => {
    const user = await openLiveMain();
    await toggleShuttle(user);

    await press(user, vehicleMarker(GATE));
    expect(screen.getByTestId('map-card')).toHaveTextContent(
      '셔틀버스 · 운행 중교내 순환 셔틀정문에 있어요 · 다음 정류장 법과대가까이 보기노선 보기',
    );

    await socketServer((socket) => {
      socket.send('shuttle-vehicles-updated', [vehicle('4522', SCIENCE)]);
    });
    expect(screen.getByTestId('map-card')).toHaveTextContent(/자연대에 있어요 · 다음 정류장 농생대/u);
  });

  it('brings the whole line into view with "노선 보기", and closes', async () => {
    const user = await openMain();
    await toggleShuttle(user);
    await press(user, stopMarker(SCIENCE));
    await press(user, CLOSER);
    expect(inView(stopMarker(GATE))).toBe(false);
    await press(user, '닫기');

    await press(user, vehicleMarker(GATE));
    await press(user, '노선 보기');

    for (const stop of STOPS) {
      expect(inView(stopMarker(stop))).toBe(true);
    }
    expect(screen.queryByTestId('map-card')).toBeNull();
  });

  it('closes when its vehicle is removed', async () => {
    const user = await openLiveMain();
    await toggleShuttle(user);
    await press(user, vehicleMarker(GATE));
    expect(screen.getByTestId('map-card')).toBeVisible();

    await socketServer((socket) => {
      socket.send('shuttle-vehicles-updated', []);
    });

    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

// In Korea's time.
function korea(instant: string): Date {
  return new Date(`${instant}+09:00`);
}

describe('the notice outside the service hours', () => {
  it.each([
    ['on a Saturday at noon', korea('2026-10-10T12:00:00')],
    ['on a weekday at 07:59', korea('2026-10-06T07:59:00')],
    ['on a weekday at 21:00', korea('2026-10-06T21:00:00')],
  ])(
    "says that the shuttle is not in service %s, with the route's service hours, over the line and the stops",
    async (_when, now) => {
      await start(now);
      const user = await openMain();

      await toggleShuttle(user);

      const notice = screen.getByTestId('shuttle-notice');
      expect(notice).toHaveTextContent(`${NOT_IN_SERVICE}${SERVICE_HOURS}`);
      expect(screen.getByText(SERVICE_HOURS)).toBeVisible();
      expect(screen.getByText(NOT_IN_SERVICE)).toHaveStyle({ fontSize: 16 });
      expect(lineDashes().length).toBeGreaterThan(0);
      expect(shown(stopMarker(GATE))).toBe(true);
    },
  );

  it.each([
    ['at 08:00', korea('2026-10-06T08:00:00')],
    ['at 20:59', korea('2026-10-06T20:59:00')],
  ])('is not shown on a weekday %s', async (_when, now) => {
    await start(now);
    const user = await openMain();

    await toggleShuttle(user);

    expect(lineDashes().length).toBeGreaterThan(0);
    expect(screen.queryByTestId('shuttle-notice')).toBeNull();
  });
});

describe('the notice as the clock passes and cards open', () => {
  it('goes at 08:00 while the layer stays on', async () => {
    await start(korea('2026-10-06T07:59:40'));
    const user = await openMain();
    await toggleShuttle(user);
    expect(screen.getByTestId('shuttle-notice')).toBeVisible();

    await pass(25_000);

    expect(screen.queryByTestId('shuttle-notice')).toBeNull();
  });

  it('gives way to an open card, and goes when the layer is turned off', async () => {
    await start(korea('2026-10-10T12:00:00'));
    const user = await openMain();
    await toggleShuttle(user);

    await press(user, stopMarker(LAW));
    expect(screen.queryByTestId('shuttle-notice')).toBeNull();
    await press(user, '닫기');
    expect(screen.getByTestId('shuttle-notice')).toBeVisible();

    await toggleShuttle(user);
    expect(screen.queryByTestId('shuttle-notice')).toBeNull();
  });
});
