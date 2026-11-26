/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as ReactNative from 'react-native';
import type * as Events from '@/telemetry/events';
import type * as Usage from '@/telemetry/usage';
import type * as User from '@/telemetry/user';
import { type FakeClient, type FakePostHogModule, madeClient } from './posthog';

// The usage layer loaded anew, as each start of the app does, with the PostHog stand-in and a fake `AppState`. For the
// layer's unit tests (`__tests__/telemetry/usage*.unit.test.ts`), each of which gives React Native the fake:
//
//   const mockAppState = fakeAppState();
//   jest.mock('react-native/Libraries/AppState/AppState', () => ({ __esModule: true, default: mockAppState }));
//
// A spy on `AppState` would not do: the layer, loaded in its own module registry, reads React Native's `AppState`
// module anew there.

// Not a real project's token: the stand-in sends nothing.
export const TOKEN = 'phc_test';
export const USER = '0193a5c1-0000-7000-8000-000000000001';
export const OTHER = '0193a5c1-0000-7000-8000-000000000002';

type ChangeListener = (state: ReactNative.AppStateStatus) => void;

export interface FakeAppState {
  currentState: ReactNative.AppStateStatus;
  addEventListener: (type: string, listener: ChangeListener) => { remove: () => void };
  listeners: Set<ChangeListener>;
}

export function fakeAppState(): FakeAppState {
  const listeners = new Set<ChangeListener>();
  return {
    currentState: 'active',
    listeners,
    addEventListener: (_type, listener) => {
      listeners.add(listener);
      return {
        remove: (): void => {
          listeners.delete(listener);
        },
      };
    },
  };
}

export interface Loaded {
  usage: typeof Usage;
  user: typeof User;
  events: typeof Events;
  posthog: FakePostHogModule;
  // Moves the app to a state, as React Native's `AppState` tells its listeners.
  moveApp: (state: ReactNative.AppStateStatus) => void;
}

// `appState` is the fake the test file gave React Native, back in the foreground with no listener.
export function loadLayer(token: string | undefined, appState: FakeAppState): Loaded {
  if (token === undefined) {
    delete process.env.EXPO_PUBLIC_POSTHOG_TOKEN;
  } else {
    process.env.EXPO_PUBLIC_POSTHOG_TOKEN = token;
  }
  appState.currentState = 'active';
  appState.listeners.clear();
  let loaded: Omit<Loaded, 'moveApp'> | undefined;
  jest.isolateModules(() => {
    loaded = {
      usage: jest.requireActual<typeof Usage>('@/telemetry/usage'),
      user: jest.requireActual<typeof User>('@/telemetry/user'),
      events: jest.requireActual<typeof Events>('@/telemetry/events'),
      posthog: jest.requireMock<FakePostHogModule>('posthog-react-native'),
    };
  });
  if (loaded === undefined) {
    throw new Error('The layer did not load');
  }
  return {
    ...loaded,
    moveApp: (state): void => {
      appState.currentState = state;
      for (const listener of appState.listeners) {
        listener(state);
      }
    },
  };
}

// A User identified with usage chosen, as a sign-in does it: the copy first, then the User. Gives the one client.
export function signIn({ usage, user, posthog }: Loaded, id = USER): FakeClient {
  usage.allowUsage(true);
  user.identifyUser(id);
  return madeClient(posthog);
}

export function forgetEnvironment(): void {
  delete process.env.EXPO_PUBLIC_POSTHOG_TOKEN;
  delete process.env.EXPO_PUBLIC_RELEASE_TAG;
  delete process.env.EXPO_PUBLIC_RELEASE_COMMIT;
}
