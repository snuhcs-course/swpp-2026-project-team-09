// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { userEvent, within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { openLive, socketServer } from './support/live';
import { givePhone, ON_CAMPUS, placeOf } from './support/main';
import { lookOf, press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMyParty, ME_HOLDER, myPicnicParty } from './support/room';
import { answerMainScreen, askMainServer, LIBRARY_POSITION, ME_ID, MIN_JUN, PHONE_NOW } from './support/server';

// The Avatars of a Friend and of a member of the User's Party as their positions age, against the fake main server
// and the fake socket.

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

const HYEON_WOO = { id: '6d1c3f5e-5555-4a5b-8c9d-000000000005', name: '오현우', department: '기계공학부' };
const MEMBER = '오현우 · 활성 파티 멤버 · 위치 공유 중';
const MINUTE = 60_000;
const MEASURED = PHONE_NOW.toISOString();
const MEMBER_POSITION = { userId: HYEON_WOO.id, latitude: 37.4555, longitude: 126.9505, measuredAt: MEASURED };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerMyParty(server, myPicnicParty(ME_ID, [ME_HOLDER, HYEON_WOO]));
  server.on('GET /positions', {
    status: 200,
    body: [{ ...LIBRARY_POSITION, measuredAt: MEASURED }, MEMBER_POSITION],
  });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("a Party member's Avatar", () => {
  it('appears, moves as positions arrive, and leaves on position-removed', async () => {
    const socket = await openLive();
    const before = placeOf(MEMBER);

    await socketServer(() => {
      socket.send('position', { ...MEMBER_POSITION, latitude: 37.4565, measuredAt: '2026-10-06T04:00:05.000Z' });
    });
    await pass(5000);
    expect(placeOf(MEMBER).top).toBeLessThan(before.top);

    await socketServer(() => {
      socket.send('position-removed', { userId: HYEON_WOO.id });
    });
    expect(screen.queryByRole('button', { name: MEMBER })).toBeNull();
  });

  it('dims after two minutes with the age on its card, is fresh again with a new position, and goes at ten', async () => {
    const socket = await openLive();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    expect(String(lookOf(MEMBER))).not.toContain('stale');

    await pass(2 * MINUTE);
    expect(String(lookOf(MEMBER))).toContain('stale');
    await press(user, MEMBER);
    expect(within(screen.getByTestId('map-card')).getByText('마지막 위치 2분 전')).toBeVisible();
    await press(user, '닫기');

    await socketServer(() => {
      socket.send('position', { ...MEMBER_POSITION, measuredAt: new Date(Date.now()).toISOString() });
    });
    expect(String(lookOf(MEMBER))).not.toContain('stale');

    await pass(10 * MINUTE);
    expect(screen.queryByRole('button', { name: MEMBER })).toBeNull();
  });
});

describe("a Friend's Avatar", () => {
  it("dims after two minutes and goes at ten, as a member's does", async () => {
    await openLive();

    await pass(2 * MINUTE);
    expect(String(lookOf(MIN_JUN.name))).toContain('stale');

    await pass(8 * MINUTE);
    expect(screen.queryByRole('button', { name: MIN_JUN.name })).toBeNull();
    expect(screen.getByRole('button', { name: '김민준 지도에서 보기' })).toBeVisible();
  });
});
