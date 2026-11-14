/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import type * as Expo from 'expo';

// A phone behind `expo-notifications`, with the real push wrapper. A test file that uses it opts in:
//
//   jest.mock('@/push/device', () => jest.requireActual<typeof PushDevice>('@/push/device'));
//   jest.mock('expo', () => jest.requireActual<typeof PushFake>('../support/push').expoModule);
//   jest.mock('expo-notifications', () => jest.requireActual<typeof PushFake>('../support/push').notificationsModule);

type Status = 'granted' | 'denied' | 'undetermined';

type TokenListener = (token: { type: string; data: string }) => void;

interface PhoneState {
  // Whether the build holds the notifications library's native part.
  native: boolean;
  permission: Status;
  // Whether the phone would show its prompt again. Android 13+ reports a permission never asked as denied with it.
  canAskAgain: boolean;
  // What the User answers to the phone's prompt.
  prompt: 'granted' | 'denied';
  token: string;
  // The Firebase token the library's token event carries, apart from the Expo push token.
  deviceToken: string;
  tokenFetches: number;
  permissionReads: number;
  prompts: number;
  unregisters: number;
  listeners: Set<TokenListener>;
  onUnregister: () => void;
}

// Made-up tokens: a real one must never be written down.
export const PHONE_TOKEN = 'ExponentPushToken[made-up-phone-1]';
export const CHANGED_TOKEN = 'ExponentPushToken[made-up-phone-2]';

// The push wrapper keeps the last device token for the whole test file, so one never goes back to an earlier value.
let deviceTokens = 0;

function freshDeviceToken(): string {
  deviceTokens += 1;
  return `made-up-device-token-${deviceTokens}`;
}

// More fetches than any test makes: the app is fetching the token in a loop.
const MAX_TOKEN_FETCHES = 20;

function doNothing(): void {
  // Nothing is watched.
}

const phone: PhoneState = {
  native: true,
  permission: 'undetermined',
  canAskAgain: true,
  prompt: 'granted',
  token: PHONE_TOKEN,
  deviceToken: freshDeviceToken(),
  tokenFetches: 0,
  permissionReads: 0,
  prompts: 0,
  unregisters: 0,
  listeners: new Set(),
  onUnregister: doNothing,
};

interface Given {
  native?: boolean;
  permission?: Status;
  // Left out, false for a denial and true otherwise.
  canAskAgain?: boolean;
  prompt?: 'granted' | 'denied';
}

export interface PushPhone {
  // The app read the permission this many times.
  permissionReads: () => number;
  // The phone's prompt was shown this many times.
  prompts: () => number;
  // The app unregistered the phone from push this many times.
  unregisters: () => number;
  // The app fetched the token this many times.
  tokenFetches: () => number;
  // The phone's token changes, as after a restore.
  changeToken: (token: string) => Promise<void>;
  // Runs at each unregistering, to see what the app still holds then.
  whenUnregistered: (does: () => void) => void;
}

export function givePushPhone(given: Given = {}): PushPhone {
  phone.native = given.native ?? true;
  phone.permission = given.permission ?? 'undetermined';
  phone.canAskAgain = given.canAskAgain ?? phone.permission !== 'denied';
  phone.prompt = given.prompt ?? 'granted';
  phone.token = PHONE_TOKEN;
  phone.tokenFetches = 0;
  phone.permissionReads = 0;
  phone.prompts = 0;
  phone.unregisters = 0;
  phone.listeners.clear();
  phone.onUnregister = doNothing;
  return {
    permissionReads: () => phone.permissionReads,
    prompts: () => phone.prompts,
    unregisters: () => phone.unregisters,
    tokenFetches: () => phone.tokenFetches,
    changeToken: async (token): Promise<void> => {
      phone.token = token;
      phone.deviceToken = freshDeviceToken();
      await act(async () => {
        sendTokenEvent();
        await jest.advanceTimersByTimeAsync(0);
      });
    },
    whenUnregistered: (does): void => {
      phone.onUnregister = does;
    },
  };
}

interface PermissionAnswer {
  status: Status;
  granted: boolean;
  canAskAgain: boolean;
}

// The library sends this event after every fetch of the token, changed or not.
function sendTokenEvent(): void {
  for (const listener of phone.listeners) {
    listener({ type: 'android', data: phone.deviceToken });
  }
}

function permissionAnswer(): PermissionAnswer {
  return { status: phone.permission, granted: phone.permission === 'granted', canAskAgain: phone.canAskAgain };
}

const actualExpo = jest.requireActual<typeof Expo>('expo');

export const expoModule = {
  ...actualExpo,
  requireOptionalNativeModule: (name: string): unknown =>
    name === 'ExpoPushTokenManager' ? (phone.native ? {} : null) : actualExpo.requireOptionalNativeModule(name),
};

export const notificationsModule = {
  AndroidImportance: { HIGH: 5 },
  setNotificationChannelAsync: (): Promise<null> => Promise.resolve(null),
  getPermissionsAsync: (): Promise<PermissionAnswer> => {
    phone.permissionReads += 1;
    return Promise.resolve(permissionAnswer());
  },
  requestPermissionsAsync: (): Promise<PermissionAnswer> => {
    phone.prompts += 1;
    phone.permission = phone.prompt;
    phone.canAskAgain = phone.prompt === 'granted';
    return Promise.resolve(permissionAnswer());
  },
  getExpoPushTokenAsync: (): Promise<{ type: 'expo'; data: string }> => {
    phone.tokenFetches += 1;
    if (phone.tokenFetches > MAX_TOKEN_FETCHES) {
      throw new Error(`The app fetched the push token more than ${MAX_TOKEN_FETCHES} times`);
    }
    sendTokenEvent();
    return Promise.resolve({ type: 'expo', data: phone.token });
  },
  addPushTokenListener: (listener: TokenListener): { remove: () => void } => {
    phone.listeners.add(listener);
    return {
      remove: (): void => {
        phone.listeners.delete(listener);
      },
    };
  },
  unregisterForNotificationsAsync: (): Promise<null> => {
    phone.unregisters += 1;
    phone.deviceToken = freshDeviceToken();
    phone.onUnregister();
    return Promise.resolve(null);
  },
};
