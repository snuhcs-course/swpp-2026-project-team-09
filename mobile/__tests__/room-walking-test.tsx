/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer, Received } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { socketServer } from './support/live';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMyParty, answerRoom, myPicnicParty, PICNIC } from './support/room';
import { askMainServer, LIBRARY_POSITION, ME_ID, PHONE_NOW } from './support/server';

// How far each member who shares is on foot from the room's next place, `301동 앞`, and the limits on asking the
// route again: only after a member moved more than 100 m, at most once a minute per member, and only while the room
// is open.

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

// About 1 m of latitude, in degrees.
const METRE = 1 / 111_195;
const MEETING = { latitude: 37.45091, longitude: 126.95289 };

let server: FakeServer;
// The routes the main screen asked before the room opened: its own way to the next Quest.
let beforeRoom = 0;

// 김민준's routes take 15 minutes and the User's 8.
function routeFor({ query }: Received): { status: number; body: unknown } {
  const his = Number(query.startLatitude) !== ON_CAMPUS.latitude;
  return {
    status: 200,
    body: { status: 'OK', route: { line: [], distance: 900, duration: his ? 900 : 480 } },
  };
}

function roomRoutes(): Received[] {
  return server.received('GET /walking-route').slice(beforeRoom);
}

function hisRoutes(): Received[] {
  return roomRoutes().filter(({ query }) => Number(query.startLatitude) !== ON_CAMPUS.latitude);
}

function myRoutes(): Received[] {
  return roomRoutes().filter(({ query }) => Number(query.startLatitude) === ON_CAMPUS.latitude);
}

// 김민준 moves north by so many metres from the library, as the socket server says and the main server then answers.
async function heMoves(metres: number, from = LIBRARY_POSITION): Promise<typeof LIBRARY_POSITION> {
  const moved = { ...from, latitude: from.latitude + metres * METRE };
  server.on('GET /positions', { status: 200, body: [moved] });
  await socketServer((socket) => {
    socket.send('position', moved);
  });
  return moved;
}

function hisLine(): string {
  const row = within(screen.getByLabelText('멤버')).getByRole('button', { name: /^김민준/u });
  return String(row.props.accessibilityLabel);
}

// The main screen with its connection, then the room at its address.
async function openSharedRoom(): Promise<void> {
  await openMain();
  beforeRoom = server.received('GET /walking-route').length;
  await act(() => {
    router.push(`/room/${PICNIC.id}`);
  });
  await pass(500);
  await socketServer((socket) => {
    socket.accept();
  });
  await pass(500);
}

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerRoom(server);
  answerMyParty(server, myPicnicParty(ME_ID));
  server.on('GET /walking-route', routeFor);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("a member's walking time", () => {
  it("says how far each member who shares is on foot, the User's own line too, with one route each", async () => {
    await openSharedRoom();

    expect(hisLine()).toBe('김민준 · 위치 공유 중 · 301동 앞까지 도보 15분');
    expect(within(screen.getByLabelText('멤버')).getByText('위치 공유 중 · 301동 앞까지 도보 8분')).toBeVisible();
    expect(hisRoutes()).toHaveLength(1);
    expect(myRoutes()).toHaveLength(1);
    expect(hisRoutes()[0]?.query).toMatchObject({
      endLatitude: String(MEETING.latitude),
      endLongitude: String(MEETING.longitude),
    });
  });

  it('says that a member is at the place, without asking a route', async () => {
    await openSharedRoom();
    const before = hisRoutes().length;

    const there = { ...LIBRARY_POSITION, ...MEETING, latitude: MEETING.latitude + 20 * METRE };
    server.on('GET /positions', { status: 200, body: [there] });
    await socketServer((socket) => {
      socket.send('position', there);
    });
    await pass(500);

    expect(hisLine()).toBe('김민준 · 위치 공유 중 · 301동 앞에 있어요');
    expect(hisRoutes()).toHaveLength(before);
  });
});

describe('the limits on asking a route again', () => {
  it('does not ask again for a member who moved 100 m or less, however long it has been', async () => {
    await openSharedRoom();

    await heMoves(60);
    await pass(3 * 60_000);

    expect(hisRoutes()).toHaveLength(1);
    expect(hisLine()).toBe('김민준 · 위치 공유 중 · 301동 앞까지 도보 15분');
  });

  it('asks again for a member who moved more than 100 m, at most once a minute', async () => {
    await openSharedRoom();
    await pass(60_000);

    const moved = await heMoves(150);
    await pass(500);
    expect(hisRoutes()).toHaveLength(2);

    // Moved again at once: not before a minute has passed since the last route.
    await heMoves(150, moved);
    await pass(40_000);
    expect(hisRoutes()).toHaveLength(2);
    await pass(30_000);
    expect(hisRoutes()).toHaveLength(3);
    // Nobody else's route was asked for it: the User has not moved.
    expect(myRoutes()).toHaveLength(1);
  });
});

describe('the room that is not open', () => {
  it('asks nothing once the room is left', async () => {
    await openSharedRoom();
    await pass(60_000);
    const before = roomRoutes().length;

    await act(() => {
      router.back();
    });
    await pass(500);
    await heMoves(500);
    await pass(3 * 60_000);

    expect(roomRoutes()).toHaveLength(before);
  });

  it('shows no walking time while the User is not in the Party', async () => {
    answerMyParty(server, null);

    await openSharedRoom();

    expect(roomRoutes()).toEqual([]);
    expect(within(screen.getByLabelText('멤버')).queryByText(/도보/u)).toBeNull();
  });
});
