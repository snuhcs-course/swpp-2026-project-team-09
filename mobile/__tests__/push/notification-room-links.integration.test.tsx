/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import type * as FakeSocketModule from '../support/fake-socket';
import type * as PushDevice from '@/push/device';
import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { sockets } from '../support/fake-socket';
import { pass, screen, shownAddress } from '../support/app';
import { givePhone, ON_CAMPUS, openMain } from '../support/main';
import { startFresh } from '../support/mocks';
import { answerRoom, PICNIC } from '../support/room';
import { askMainServer, PHONE_NOW } from '../support/server';

// A tapped push of a 파티's own news, `room:<questId>` (P06 ticket 37), opens the 파티's room in one move, from where
// the User is: never the map first and the room after it. With the real wrapper over a stand-in for
// `expo-notifications`.

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
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('../support/fake-socket'));
jest.mock('@/push/device', () => jest.requireActual<typeof PushDevice>('@/push/device'));

interface Response {
  actionIdentifier: string;
  notification: { date: number; request: { identifier: string; content: { data: { url: unknown } } } };
}

// The listener the app gave for taps.
let mockTapListener: ((response: Response) => void) | null = null;

jest.mock('expo-notifications', () => ({
  // The wrapper recognizes the library by it.
  getExpoPushTokenAsync: (): Promise<null> => Promise.resolve(null),
  getLastNotificationResponse: (): null => null,
  clearLastNotificationResponse: (): void => undefined,
  addNotificationResponseReceivedListener: (listener: (response: Response) => void): { remove: () => void } => {
    mockTapListener = listener;
    return {
      remove: (): void => {
        mockTapListener = null;
      },
    };
  },
  addNotificationReceivedListener: (): { remove: () => void } => ({ remove: (): void => undefined }),
  setNotificationHandler: (): void => undefined,
}));

const ROOM = `/room/${PICNIC.id}`;

async function tapRoomPush(): Promise<void> {
  await act(() => {
    mockTapListener?.({
      actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
      notification: {
        date: 0,
        request: { identifier: 'push-1', content: { data: { url: `/main?card=room:${PICNIC.id}` } } },
      },
    });
  });
  await pass(500);
}

// Every move the app asked of the router, as the address it was asked to show.
function movesOf(spies: readonly jest.SpyInstance[]): string[] {
  return spies.flatMap((spy) => spy.mock.calls.map(([target]: unknown[]) => JSON.stringify(target)));
}

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  mockTapListener = null;
  const server = await askMainServer({ signedIn: true });
  answerRoom(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("a tapped push of a 파티's own news", () => {
  it("opens the 파티's room from the tabs in one move, without the map's card", async () => {
    await openMain();
    const spies = [jest.spyOn(router, 'push'), jest.spyOn(router, 'navigate'), jest.spyOn(router, 'dismissTo')];

    await tapRoomPush();

    expect(movesOf(spies)).toEqual([JSON.stringify(ROOM)]);
    expect(shownAddress()).toBe(ROOM);
    expect(screen.getByText(PICNIC.title)).toBeVisible();
  });

  it('opens the room over a screen above the tabs, and 뒤로 comes back to it', async () => {
    await openMain();
    await act(() => {
      router.navigate('/notifications');
    });
    await pass(500);

    await tapRoomPush();

    expect(shownAddress()).toBe(ROOM);
    await act(() => {
      router.back();
    });
    await pass(500);
    expect(shownAddress()).toBe('/notifications');
  });
});
