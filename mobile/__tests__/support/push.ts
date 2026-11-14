/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import type * as Expo from 'expo';

// A phone behind `expo-notifications`, with the real push wrapper. A test file that uses it opts in:
//
//   jest.mock('@/push/device', () => jest.requireActual<typeof PushDevice>('@/push/device'));
//   jest.mock('expo', () => jest.requireActual<typeof PushFake>('../support/push').expoModule);
//   jest.mock('expo-notifications', () => jest.requireActual<typeof PushFake>('../support/push').notificationsModule);

type Status = 'granted' | 'denied' | 'undetermined';

interface PhoneState {
  // Whether the build holds the notifications library's native part.
  native: boolean;
  permission: Status;
  // Whether the phone would show its prompt again. Android 13+ reports a permission never asked as denied with it.
  canAskAgain: boolean;
  // What the User answers to the phone's prompt.
  prompt: 'granted' | 'denied';
  token: string;
  permissionReads: number;
  prompts: number;
  unregisters: number;
  listeners: Set<() => void>;
  onUnregister: () => void;
}

// Made-up tokens: a real one must never be written down.
export const PHONE_TOKEN = 'ExponentPushToken[made-up-phone-1]';
export const CHANGED_TOKEN = 'ExponentPushToken[made-up-phone-2]';

function doNothing(): void {
  // Nothing is watched.
}

const phone: PhoneState = {
  native: true,
  permission: 'undetermined',
  canAskAgain: true,
  prompt: 'granted',
  token: PHONE_TOKEN,
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
  phone.permissionReads = 0;
  phone.prompts = 0;
  phone.unregisters = 0;
  phone.listeners.clear();
  phone.onUnregister = doNothing;
  return {
    permissionReads: () => phone.permissionReads,
    prompts: () => phone.prompts,
    unregisters: () => phone.unregisters,
    changeToken: async (token): Promise<void> => {
      phone.token = token;
      await act(async () => {
        for (const listener of phone.listeners) {
          listener();
        }
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
  getExpoPushTokenAsync: (): Promise<{ type: 'expo'; data: string }> =>
    Promise.resolve({ type: 'expo', data: phone.token }),
  addPushTokenListener: (listener: () => void): { remove: () => void } => {
    phone.listeners.add(listener);
    return {
      remove: (): void => {
        phone.listeners.delete(listener);
      },
    };
  },
  unregisterForNotificationsAsync: (): Promise<null> => {
    phone.unregisters += 1;
    phone.onUnregister();
    return Promise.resolve(null);
  },
};
