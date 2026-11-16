/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { FIVE_AT_MOST, openZones, pencil, SCREEN_LINE, zone, ZONES_ROUTE } from './support/private-zones';
import { answerMainScreen, askMainServer, LOBBY, PHONE_NOW } from './support/server';

// The zone screen's saved Private Zones (P02 ticket 29) against the fake main server: each filled over the map and
// listed with 삭제, the pencil off at five, and the zones hidden while the map may move.

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

const NEAR_301 = zone(1, '301동 근처');
const NEAR_302 = zone(2, '302동 근처');

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: true } });
  server.on('POST /positions', { status: 200, body: { offCampus: false, privateZone: false } });
  server.on(ZONES_ROUTE, { status: 200, body: { zones: [NEAR_301, NEAR_302] } });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('The zone screen', () => {
  it("fills each saved zone over the map and lists it with 삭제, under the screen's line", async () => {
    await openZones();

    expect(screen.getByRole('header', { name: '비공개 구역' })).toBeVisible();
    expect(screen.getAllByTestId('saved-zone')).toHaveLength(2);
    expect(screen.getByText(SCREEN_LINE)).toBeVisible();
    expect(screen.getByText('301동 근처')).toBeVisible();
    expect(screen.getByText('302동 근처')).toBeVisible();
    expect(screen.getAllByRole('button', { name: /삭제$/u })).toHaveLength(2);
    expect(screen.getByText(FIVE_AT_MOST)).toBeVisible();
    expect(pencil()).toBeEnabled();
  });

  it('deletes a zone with 삭제, and it is gone from the map and the list', async () => {
    const removed = `DELETE /users/me/private-zones/${NEAR_301.id}`;
    server.on(removed, () => {
      server.on(ZONES_ROUTE, { status: 200, body: { zones: [NEAR_302] } });
      return { status: 204 };
    });
    const user = await openZones();

    await user.press(screen.getByRole('button', { name: '301동 근처 삭제' }));
    await pass(500);

    expect(server.received(removed)).toHaveLength(1);
    expect(screen.queryByText('301동 근처')).toBeNull();
    expect(screen.getAllByTestId('saved-zone')).toHaveLength(1);
  });

  it('turns the pencil off at five zones', async () => {
    const five = [1, 2, 3, 4, 5].map((index) => zone(index, `${String(index)}번 구역`));
    server.on(ZONES_ROUTE, { status: 200, body: { zones: five } });

    await openZones();

    expect(pencil()).toBeDisabled();
    expect(screen.getByText(FIVE_AT_MOST)).toBeVisible();
    expect(screen.getAllByTestId('saved-zone')).toHaveLength(5);
  });
});

describe('The zones over a map that moves', () => {
  it('are hidden while a finger is on the map, and come back after it lifts even if the camera did not move', async () => {
    await openZones();
    const map = screen.getByTestId('zone-map');

    await fireEvent(map, 'touchStart', { nativeEvent: { touches: [{ pageX: 100, pageY: 100 }] } });
    expect(screen.queryAllByTestId('saved-zone')).toHaveLength(0);
    await fireEvent(map, 'touchEnd', { nativeEvent: { touches: [] } });
    await pass(1000);

    expect(screen.getAllByTestId('saved-zone')).toHaveLength(2);
  });
});
