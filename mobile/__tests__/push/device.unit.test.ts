/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import * as PushDevice from '@/push/device';

const { askPushPermission, expoPushToken, onPushTokenChange, pushAvailable, pushPermission, unregisterPush } =
  PushDevice;

// The setup mocks the wrapper as unavailable for every test; this file tests the real one.
jest.mock('@/push/device', () => jest.requireActual<typeof PushDevice>('@/push/device'));

interface Permission {
  status: string;
  granted: boolean;
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
// The listener the library was given, to play a token change.
let mockTokenListener: ((token: Token) => void) | null = null;

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
    mockAnswer(`setNotificationChannelAsync(${id}, ${channel.name}, ${channel.importance})`, null),
  getPermissionsAsync: (): Promise<Permission> =>
    mockAnswer('getPermissionsAsync()', mockPermission, mockPermissionFails),
  requestPermissionsAsync: (): Promise<Permission> =>
    mockAnswer('requestPermissionsAsync()', { status: 'granted', granted: true }, mockPermissionFails),
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
      },
    };
  },
  unregisterForNotificationsAsync: (): Promise<void> => {
    mockCalls.push('unregisterForNotificationsAsync()');
    return Promise.resolve();
  },
}));

const GRANTED: Permission = { status: 'granted', granted: true };

afterEach(() => {
  mockTokenManager = null;
  mockCalls.length = 0;
  mockPermission = { status: 'undetermined', granted: false };
  mockPermissionFails = false;
  mockTokenFails = false;
  mockTokenListener = null;
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
    await expect(unregisterPush()).resolves.toBeUndefined();
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

  it("tells the listener when the phone's token changes, until it unsubscribes", () => {
    let changes = 0;
    const unsubscribe = onPushTokenChange(() => {
      changes += 1;
    });
    mockTokenListener?.({ type: 'android', data: 'device-token' });
    unsubscribe();

    expect(changes).toBe(1);
    expect(mockCalls).toEqual(['addPushTokenListener()', 'remove()']);
  });

  it('unregisters the phone from push once', async () => {
    await expect(unregisterPush()).resolves.toBeUndefined();
    expect(mockCalls).toEqual(['unregisterForNotificationsAsync()']);
  });
});
