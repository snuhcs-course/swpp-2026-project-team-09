/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { Platform } from 'react-native';
import * as PushDevice from '@/push/device';

const { askPushPermission, expoPushToken, onPushTokenChange, pushAvailable, pushPermission, unregisterPush } =
  PushDevice;

// The setup mocks the wrapper as unavailable for every test; this file tests the real one.
jest.mock('@/push/device', () => jest.requireActual<typeof PushDevice>('@/push/device'));

interface Permission {
  status: string;
  granted: boolean;
  canAskAgain?: boolean;
}

interface Token {
  type: string;
  data: string;
}

// What `requireOptionalNativeModule` finds: null by default, as in a build before the native part.
let mockTokenManager: object | null = null;
// The calls the library received, in order, as `name(arguments)`.
const mockCalls: string[] = [];
// What the phone answers about the permission, and to the token call.
let mockPermission: Permission = { status: 'undetermined', granted: false };
let mockPermissionFails = false;
let mockTokenFails = false;
let mockPermissionRefused = false;
let mockChannelFails = false;
// The listener the library was given, to play a token change.
let mockTokenListener: ((token: Token) => void) | null = null;
// What the library's unregister call returns.
let mockUnregister: () => Promise<void> = () => Promise.resolve();

function mockAnswer<T>(call: string, answer: T, fails = false): Promise<T> {
  mockCalls.push(call);
  return fails ? Promise.reject(new Error('Network request failed')) : Promise.resolve(answer);
}

jest.mock('expo', () => ({
  requireOptionalNativeModule: (name: string): unknown => (name === 'ExpoPushTokenManager' ? mockTokenManager : null),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
}));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 5 },
  setNotificationChannelAsync: (id: string, channel: { name: string; importance: number }): Promise<null> =>
    mockAnswer(`setNotificationChannelAsync(${id}, ${channel.name}, ${channel.importance})`, null, mockChannelFails),
  getPermissionsAsync: (): Promise<Permission> =>
    mockAnswer('getPermissionsAsync()', mockPermission, mockPermissionFails),
  requestPermissionsAsync: (): Promise<Permission> =>
    mockAnswer(
      'requestPermissionsAsync()',
      mockPermissionRefused ? { status: 'denied', granted: false } : { status: 'granted', granted: true },
      mockPermissionFails,
    ),
  getExpoPushTokenAsync: (options: { projectId: string }): Promise<Token> =>
    mockAnswer(
      `getExpoPushTokenAsync(${options.projectId})`,
      { type: 'expo', data: 'ExponentPushToken[test-token]' },
      mockTokenFails,
    ),
  addPushTokenListener: (listener: (token: Token) => void): { remove: () => void } => {
    mockCalls.push('addPushTokenListener()');
    mockTokenListener = listener;
    return {
      remove: (): void => {
        mockCalls.push('remove()');
        mockTokenListener = null;
      },
    };
  },
  unregisterForNotificationsAsync: (): Promise<void> => {
    mockCalls.push('unregisterForNotificationsAsync()');
    return mockUnregister();
  },
}));

const GRANTED: Permission = { status: 'granted', granted: true };

// The wrapper keeps the last token the phone gave, so a test of the token listener starts from a fresh copy.
function freshDevice(): typeof PushDevice {
  let fresh: typeof PushDevice | undefined;
  jest.isolateModules(() => {
    fresh = jest.requireActual<typeof PushDevice>('@/push/device');
  });
  if (fresh === undefined) {
    throw new Error('The wrapper did not load');
  }
  return fresh;
}

afterEach(() => {
  mockTokenManager = null;
  mockCalls.length = 0;
  mockPermission = { status: 'undetermined', granted: false };
  mockPermissionFails = false;
  mockTokenFails = false;
  mockPermissionRefused = false;
  mockChannelFails = false;
  mockTokenListener = null;
  mockUnregister = (): Promise<void> => Promise.resolve();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the push wrapper without the native module', () => {
  it('reports "unavailable", and never throws', async () => {
    expect(pushAvailable()).toBe(false);
    await expect(pushPermission()).resolves.toBe('unavailable');
    await expect(askPushPermission()).resolves.toBe('unavailable');
    await expect(expoPushToken()).resolves.toBeNull();
    const unsubscribe = onPushTokenChange(() => {
      throw new Error('No change should be told');
    });
    expect(unsubscribe).not.toThrow();
    await expect(unregisterPush()).resolves.toBe(true);
    expect(mockCalls).toEqual([]);
  });
});

describe('the push wrapper asking', () => {
  beforeEach(() => {
    mockTokenManager = {};
  });

  it('creates the channel "알림" before it asks for the permission', async () => {
    await expect(askPushPermission()).resolves.toBe('granted');
    expect(mockCalls).toEqual(['setNotificationChannelAsync(default, 알림, 5)', 'requestPermissionsAsync()']);
  });

  it('reports "unavailable" instead of throwing when the phone fails to answer about the permission', async () => {
    mockPermissionFails = true;

    await expect(pushPermission()).resolves.toBe('unavailable');
    await expect(askPushPermission()).resolves.toBe('unavailable');
    await expect(expoPushToken()).resolves.toBeNull();
  });

  it('reports "denied" when the User refuses the prompt', async () => {
    mockPermissionRefused = true;

    await expect(askPushPermission()).resolves.toBe('denied');
  });

  it('reports "unavailable" and gives no token when the channel cannot be created', async () => {
    mockPermission = GRANTED;
    mockChannelFails = true;

    await expect(askPushPermission()).resolves.toBe('unavailable');
    await expect(expoPushToken()).resolves.toBeNull();
  });
});

describe('the push wrapper and the token', () => {
  beforeEach(() => {
    mockTokenManager = {};
  });

  it('creates the channel before it asks for the token, and asks with the EAS project id', async () => {
    mockPermission = GRANTED;

    await expect(expoPushToken()).resolves.toBe('ExponentPushToken[test-token]');
    expect(mockCalls).toEqual([
      'getPermissionsAsync()',
      'setNotificationChannelAsync(default, 알림, 5)',
      'getExpoPushTokenAsync(test-project-id)',
    ]);
  });

  it('gives no token when the token call fails, offline for example', async () => {
    mockPermission = GRANTED;
    mockTokenFails = true;

    await expect(expoPushToken()).resolves.toBeNull();
  });

  it('gives no token and asks for none while the permission is not granted', async () => {
    mockPermission = { status: 'denied', granted: false };

    await expect(expoPushToken()).resolves.toBeNull();
    expect(mockCalls).toEqual(['getPermissionsAsync()']);
  });
});

describe("the push wrapper and a change of the phone's token", () => {
  beforeEach(() => {
    mockTokenManager = {};
  });

  it('does not tell the listener of the token the phone already had', () => {
    let changes = 0;
    freshDevice().onPushTokenChange(() => {
      changes += 1;
    });
    mockTokenListener?.({ type: 'android', data: 'device-token' });
    mockTokenListener?.({ type: 'android', data: 'device-token' });

    expect(changes).toBe(0);
  });

  it("tells the listener once when the phone's token changes, until it unsubscribes", () => {
    let changes = 0;
    const unsubscribe = freshDevice().onPushTokenChange(() => {
      changes += 1;
    });
    mockTokenListener?.({ type: 'android', data: 'device-token' });
    mockTokenListener?.({ type: 'android', data: 'new-device-token' });
    mockTokenListener?.({ type: 'android', data: 'new-device-token' });
    expect(changes).toBe(1);

    unsubscribe();
    mockTokenListener?.({ type: 'android', data: 'another-device-token' });

    expect(changes).toBe(1);
    expect(mockCalls).toEqual(['addPushTokenListener()', 'remove()']);
  });

  it("takes the phone's first token after an unregistering as its first, not as a change", async () => {
    const device = freshDevice();
    const told = jest.fn<void, []>();
    device.onPushTokenChange(told);
    mockTokenListener?.({ type: 'android', data: 'device-token-a' });
    await device.unregisterPush();
    mockTokenListener?.({ type: 'android', data: 'device-token-b' });
    expect(told).not.toHaveBeenCalled();
    mockTokenListener?.({ type: 'android', data: 'device-token-c' });
    expect(told).toHaveBeenCalledTimes(1);
  });
});

describe('the push wrapper unregistering', () => {
  beforeEach(() => {
    mockTokenManager = {};
  });

  it('unregisters the phone from push once', async () => {
    jest.useFakeTimers();

    await expect(unregisterPush()).resolves.toBe(true);
    expect(mockCalls).toEqual(['unregisterForNotificationsAsync()']);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('unregisters without throwing when the library call fails', async () => {
    mockUnregister = (): Promise<void> => Promise.reject(new Error('Network request failed'));

    await expect(unregisterPush()).resolves.toBe(false);
  });

  it('stops waiting for the library after 3 seconds', async () => {
    jest.useFakeTimers();
    mockUnregister = (): Promise<void> =>
      new Promise<void>(() => {
        // The phone never answers.
      });
    let answer: boolean | undefined;
    void unregisterPush().then((unregistered) => {
      answer = unregistered;
    });

    await jest.advanceTimersByTimeAsync(2999);
    expect(answer).toBeUndefined();
    await jest.advanceTimersByTimeAsync(1);
    expect(answer).toBe(false);
  });
});

describe('the push wrapper reading the permission', () => {
  beforeEach(() => {
    mockTokenManager = {};
  });

  it('reads a permission Android 13+ reports as denied, but can still ask, as not yet asked', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockPermission = { status: 'denied', granted: false, canAskAgain: true };

    await expect(pushPermission()).resolves.toBe('undetermined');
  });

  it('reads a permission Android can no longer ask for as denied', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockPermission = { status: 'denied', granted: false, canAskAgain: false };

    await expect(pushPermission()).resolves.toBe('denied');
  });

  it('reads a granted permission on Android as granted', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockPermission = { status: 'granted', granted: true, canAskAgain: true };

    await expect(pushPermission()).resolves.toBe('granted');
  });

  it('keeps a denied permission on iOS denied, whether or not it can ask again', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    mockPermission = { status: 'denied', granted: false, canAskAgain: true };
    await expect(pushPermission()).resolves.toBe('denied');

    mockPermission = { status: 'denied', granted: false, canAskAgain: false };
    await expect(pushPermission()).resolves.toBe('denied');
  });
});
