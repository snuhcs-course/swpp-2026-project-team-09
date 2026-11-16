/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import {
  ADD_ROUTE,
  BIGGER,
  draw,
  loop,
  openZones,
  outlineOf,
  pencil,
  SAVED,
  unsavedZones,
  zone,
  ZONES_ROUTE,
} from './support/private-zones';
import { answerMainScreen, askMainServer, LOBBY, PHONE_NOW } from './support/server';
import { hasGesture } from './support/swipe';

// Drawing a Private Zone on the zone screen (P02 ticket 29) against the fake main server: the pencil on, one loop
// drawn by a finger and sent as its outline, a loop drawn again in its place, the pencil off, 취소, and the outlines
// refused in the app or by the main server.

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

// About 57 m round at zoom 17, and a smaller one beside it.
const LOOP = loop({ x: 195, y: 240 }, 60, 24);
const OTHER = loop({ x: 250, y: 300 }, 40, 20);
// About 10 m a side.
const TINY = [
  { x: 195, y: 240 },
  { x: 205, y: 240 },
  { x: 200, y: 249 },
];

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: true } });
  server.on('POST /positions', { status: 200, body: { offCampus: false, privateZone: false } });
  server.on(ZONES_ROUTE, { status: 200, body: { zones: [] } });
  server.on(ADD_ROUTE, { status: 201, body: zone(1, '301동 근처') });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const bodies = (): unknown[] => server.received(ADD_ROUTE).map(({ body }) => body);

describe('Drawing a Private Zone', () => {
  it('draws a loop with the pencil on, fills it, and sends its outline with 저장', async () => {
    const user = await openZones();

    await user.press(pencil());
    expect(pencil()).toBeChecked();
    await draw(LOOP);

    expect(unsavedZones()).toHaveLength(1);
    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(500);

    expect(bodies()).toEqual([{ outline: outlineOf(LOOP) }]);
    expect(screen.getByText(SAVED)).toBeVisible();
    expect(unsavedZones()).toHaveLength(0);
    expect(pencil()).not.toBeChecked();
  });

  it('replaces an unsaved outline with the next loop', async () => {
    const user = await openZones();
    await user.press(pencil());

    await draw(LOOP);
    await draw(OTHER);

    expect(unsavedZones()).toHaveLength(1);
    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(500);
    expect(bodies()).toEqual([{ outline: outlineOf(OTHER) }]);
  });
});

describe('The pencil off, 취소, and a finger that barely moves', () => {
  it('keeps the outline in its place with the pencil off, and leaves the finger to the map', async () => {
    const user = await openZones();
    await user.press(pencil());
    await draw(LOOP);

    await user.press(pencil());

    expect(pencil()).not.toBeChecked();
    expect(hasGesture('zone-drawing')).toBe(false);
    expect(unsavedZones()).toHaveLength(1);
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
  });

  it('drops the outline with 취소 and sends nothing', async () => {
    const user = await openZones();
    await user.press(pencil());
    await draw(LOOP);

    await user.press(screen.getByRole('button', { name: '취소' }));
    await pass(500);

    expect(unsavedZones()).toHaveLength(0);
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    expect(bodies()).toEqual([]);
  });

  it('draws nothing for a finger that barely moves', async () => {
    const user = await openZones();
    await user.press(pencil());

    await draw([
      { x: 100, y: 100 },
      { x: 103, y: 102 },
    ]);

    expect(unsavedZones()).toHaveLength(0);
  });
});

describe('An outline refused', () => {
  it('says 조금 더 크게 둘러 주세요 for one that fits in a 17 m square, and does not send it', async () => {
    const user = await openZones();
    await user.press(pencil());

    await draw(TINY);

    expect(screen.getByText(BIGGER)).toBeVisible();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(500);
    expect(bodies()).toEqual([]);
  });

  it.each([
    ['PRIVATE_ZONE_OFF_CAMPUS', '캠퍼스 가까이에서만 그릴 수 있어요'],
    ['PRIVATE_ZONE_TOO_SMALL', BIGGER],
  ])('says the line for %s from the main server, and keeps the outline', async (code, line) => {
    server.on(ADD_ROUTE, refusal(400, code));
    const user = await openZones();
    await user.press(pencil());
    await draw(LOOP);

    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(500);

    expect(screen.getByText(line)).toBeVisible();
    expect(unsavedZones()).toHaveLength(1);
    expect(screen.queryByText(SAVED)).toBeNull();
  });
});
