/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import type * as FakeSocketModule from '../support/fake-socket';
import type * as PushDevice from '@/push/device';
import { act, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { type FakeServer, refusal } from '../support/fake-server';
import { sockets } from '../support/fake-socket';
import { pass, screen, shownAddress, startApp } from '../support/app';
import { givePhone, ON_CAMPUS, openMain, placeOf } from '../support/main';
import { startFresh } from '../support/mocks';
import { ONBOARDING, saveOnboarding } from '../support/onboarding';
import { answerMainScreen, askMainServer, INVITATION, LOBBY, MIN_JUN, PHONE_NOW } from '../support/server';
import { keep } from '@/storage/kept';

// A tapped push opens the address in its data, and a push that arrives while the app is open fetches 알림 again,
// with the real wrapper over a stand-in for `expo-notifications`.

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

// What the phone holds: the response to the tap that started the app, and how often the app cleared it.
let mockLastResponse: Response | null = null;
let mockCleared = 0;
// The listeners the app gave for taps and for pushes that arrive while it runs, and what it answers for a push in
// front.
let mockTapListener: ((response: Response) => void) | null = null;
let mockArrivalListener: ((notification: Response['notification']) => void) | null = null;
let mockHandler: { handleNotification: (notification: Response['notification']) => Promise<unknown> } | null = null;

jest.mock('expo-notifications', () => ({
  // The wrapper recognizes the library by it.
  getExpoPushTokenAsync: (): Promise<null> => Promise.resolve(null),
  getLastNotificationResponse: (): Response | null => mockLastResponse,
  clearLastNotificationResponse: (): void => {
    mockLastResponse = null;
    mockCleared += 1;
  },
  addNotificationResponseReceivedListener: (listener: (response: Response) => void): { remove: () => void } => {
    mockTapListener = listener;
    return {
      remove: (): void => {
        mockTapListener = null;
      },
    };
  },
  addNotificationReceivedListener: (
    listener: (notification: Response['notification']) => void,
  ): { remove: () => void } => {
    mockArrivalListener = listener;
    return {
      remove: (): void => {
        mockArrivalListener = null;
      },
    };
  },
  setNotificationHandler: (handler: typeof mockHandler): void => {
    mockHandler = handler;
  },
}));

function tapOn(url: unknown, identifier = 'push-1'): Response {
  return {
    actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
    notification: { date: 0, request: { identifier, content: { data: { url } } } },
  };
}

async function tap(response: Response): Promise<void> {
  await act(() => {
    mockTapListener?.(response);
  });
  await pass(500);
}

async function openTab(address: string): Promise<void> {
  await act(() => {
    router.navigate(address);
  });
  await pass(500);
}

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  mockLastResponse = null;
  mockCleared = 0;
  mockTapListener = null;
  mockArrivalListener = null;
  mockHandler = null;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /quest-invitations', { status: 200, body: [INVITATION] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('a push tapped while the app was closed', () => {
  it("opens the 파티 tab's invitations after the loading screen, and is cleared", async () => {
    mockLastResponse = tapOn(`/main?card=invitation:${INVITATION.id}`);
    await keep({ signedIn: true, consented: true, onboardingCompleted: true });
    await startApp();

    expect(screen.getByRole('progressbar', { name: '불러오는 중' })).toBeVisible();
    expect(mockCleared).toBe(0);

    await pass(1000);
    await pass(1000);

    expect(shownAddress()).toBe('/party?tab=invites');
    expect(screen.getByText('물리 실험 보고서')).toBeVisible();
    expect(mockCleared).toBe(1);
  });

  it('opens after Onboarding when Onboarding was unfinished', async () => {
    mockLastResponse = tapOn(`/main?card=invitation:${INVITATION.id}`);
    server.on(
      'POST /lobby',
      refusal(403, 'ONBOARDING_REQUIRED', {
        onboarding: { completed: false, suggestion: { name: '홍길동', department: null } },
      }),
    );
    server.on('POST /users/me/onboarding', { status: 204 });
    await keep({ signedIn: true, consented: true, onboardingCompleted: true });
    await startApp();
    await pass(1000);

    expect(screen.getByRole('header', { name: ONBOARDING })).toBeVisible();
    expect(mockCleared).toBe(0);

    server.on('POST /lobby', { status: 200, body: LOBBY });
    await saveOnboarding(userEvent.setup({ advanceTimers: jest.advanceTimersByTime }));
    await pass(1000);

    expect(shownAddress()).toBe('/party?tab=invites');
    expect(mockCleared).toBe(1);
  });
});

describe('a push tapped while the app runs', () => {
  it("moves the map to the Friend and opens the Friend's card, and takes `card` off the address", async () => {
    await openMain();
    const before = placeOf('김민준');

    await tap(tapOn(`/main?card=friend:${MIN_JUN.id}`));

    expect(screen.getByRole('header', { name: '김민준' })).toBeVisible();
    expect(placeOf('김민준')).not.toEqual(before);
    // The test router still prints a cleared parameter's name, as `card=undefined`.
    expect(shownAddress()).toMatch(/^\/main(?:\?card=undefined)?$/u);
  });

  it('closes the screen above the tabs', async () => {
    await openMain();
    await act(() => {
      router.push('/notifications');
    });
    await pass(500);
    expect(screen.getByRole('header', { name: /^알림/u })).toBeVisible();

    await tap(tapOn(`/main?card=friend:${MIN_JUN.id}`));

    expect(screen.queryByRole('header', { name: /^알림/u, includeHiddenElements: true })).toBeNull();
    expect(router.canDismiss()).toBe(false);
    expect(screen.getByRole('header', { name: '김민준' })).toBeVisible();
  });
});

describe('a tap that comes twice', () => {
  it('opens once when the tap that started the app also comes through the listener', async () => {
    const response = tapOn(`/main?card=invitation:${INVITATION.id}`);
    mockLastResponse = response;
    await keep({ signedIn: true, consented: true, onboardingCompleted: true });
    await startApp();
    await pass(1000);
    await pass(1000);
    expect(shownAddress()).toBe('/party?tab=invites');
    await openTab('/me');

    await tap(response);

    expect(shownAddress()).toBe('/me');
    expect(mockCleared).toBe(1);
  });
});

describe('a tap on a push whose data is not an address', () => {
  it.each([['https://example.com'], ['/main?card=friend'], [undefined]])(
    'leaves the app where it was, for %p',
    async (url) => {
      await openMain();
      await openTab('/me');

      await tap(tapOn(url));

      expect(shownAddress()).toBe('/me');
      expect(mockCleared).toBe(0);
    },
  );
});

describe('a push that arrives while the app is in front', () => {
  it('drops no banner and plays no sound, and goes to the notification list', async () => {
    await openMain();

    await expect(mockHandler?.handleNotification(tapOn(null).notification)).resolves.toEqual({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    });
  });

  it('makes the app fetch the invitations again', async () => {
    await openMain();
    const before = server.received('GET /quest-invitations').length;

    await act(() => {
      mockArrivalListener?.(tapOn(`/main?card=invitation:${INVITATION.id}`).notification);
    });
    await pass(500);

    expect(server.received('GET /quest-invitations')).toHaveLength(before + 1);
  });
});
