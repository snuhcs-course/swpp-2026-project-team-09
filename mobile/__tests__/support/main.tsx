import { act, userEvent } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { AppState, Linking, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import type { LatLng } from '@/api/types';
import { type Kept, keep } from '@/storage/kept';
import { pass, screen, startApp } from './app';

// Where the `Main` frame draws the User, and a place in the city outside the campus rectangle.
export const ON_CAMPUS: LatLng = { latitude: 37.45905, longitude: 126.9512 };
export const NEAR_LIBRARY: LatLng = { latitude: 37.4598, longitude: 126.9521 };
export const OFF_CAMPUS: LatLng = { latitude: 37.5665, longitude: 126.978 };

export const ME = '내 위치';
export const EXPLANATION = '내 위치를 지도에 표시할까요?';

// `blocked`: refused, and the system no longer shows its prompt.
type Permission = 'unasked' | 'granted' | 'refused' | 'blocked';

const STATUS = {
  unasked: Location.PermissionStatus.UNDETERMINED,
  granted: Location.PermissionStatus.GRANTED,
  refused: Location.PermissionStatus.DENIED,
  blocked: Location.PermissionStatus.DENIED,
} as const;

function answerOf(permission: Permission): Location.LocationPermissionResponse {
  return {
    status: STATUS[permission],
    granted: permission === 'granted',
    canAskAgain: permission !== 'blocked',
    expires: 'never',
  };
}

function fix({ latitude, longitude }: LatLng): Location.LocationObject {
  return {
    coords: { latitude, longitude, altitude: null, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null },
    // Measured now, by the test's clock.
    timestamp: Date.now(),
  };
}

interface Given {
  permission: Permission;
  // What the User answers to the system's prompt. Left out, a refusal.
  prompt?: Permission;
  // What the phone measures when a watch starts. Left out, nothing until `moveTo`.
  position?: LatLng;
  // The last position the phone knows before it measures one.
  lastKnown?: LatLng;
  // Location services are turned off: a watch cannot start.
  servicesOff?: boolean;
}

export interface Phone {
  // The system's prompt was shown this many times.
  prompts: () => number;
  // A watch of the position was started this many times.
  watches: () => number;
  // The phone's settings were opened this many times.
  settingsOpened: () => number;
  // The phone measures a new position.
  moveTo: (position: LatLng) => Promise<void>;
  // The User changes the permission in the phone's settings.
  setPermission: (permission: Permission) => void;
  turnServicesOn: () => void;
  // The app returns to the front, as after the phone's settings.
  comeToFront: () => Promise<void>;
  // The User leaves the app for another, or the home screen.
  goToBackground: () => Promise<void>;
}

type FrontListener = Parameters<typeof AppState.addEventListener>[1];

// The app's state as the test tells it: the listeners that wait for the app to return to the front.
function watchFront(): Set<FrontListener> {
  const listeners = new Set<FrontListener>();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    listeners.add(listener);
    return {
      remove: (): void => {
        listeners.delete(listener);
      },
    };
  });
  return listeners;
}

// The phone's watch of the position: it measures `given.position` at once, and cannot start with the services off.
function giveWatch(given: Given, services: { on: boolean }): Set<Location.LocationCallback> {
  const watchers = new Set<Location.LocationCallback>();
  jest.mocked(Location.watchPositionAsync).mockReset();
  jest.mocked(Location.getLastKnownPositionAsync).mockReset();
  jest
    .mocked(Location.getLastKnownPositionAsync)
    .mockResolvedValue(given.lastKnown === undefined ? null : fix(given.lastKnown));
  jest.mocked(Location.watchPositionAsync).mockImplementation((_options, watcher) => {
    if (!services.on) {
      return Promise.reject(new Error('Location services are disabled'));
    }
    watchers.add(watcher);
    if (given.position !== undefined) {
      watcher(fix(given.position));
    }
    return Promise.resolve({
      remove: (): void => {
        watchers.delete(watcher);
      },
    });
  });
  return watchers;
}

// A phone behind `expo-location`, which the test file mocks: what it says about the permission, what the User
// answers to the system's prompt, and where it is.
export function givePhone(given: Given): Phone {
  const services = { on: given.servicesOff !== true };
  const watchers = giveWatch(given, services);
  const front = watchFront();
  const settings = jest.spyOn(Linking, 'openSettings').mockReset().mockResolvedValue();
  jest.mocked(Location.getForegroundPermissionsAsync).mockReset();
  jest.mocked(Location.requestForegroundPermissionsAsync).mockReset();
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(answerOf(given.permission));
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(answerOf(given.prompt ?? 'refused'));
  return {
    prompts: () => jest.mocked(Location.requestForegroundPermissionsAsync).mock.calls.length,
    watches: () => jest.mocked(Location.watchPositionAsync).mock.calls.length,
    settingsOpened: () => settings.mock.calls.length,
    moveTo: async (position): Promise<void> => {
      await act(() => {
        for (const watcher of watchers) {
          watcher(fix(position));
        }
      });
    },
    setPermission: (permission): void => {
      jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(answerOf(permission));
    },
    turnServicesOn: (): void => {
      services.on = true;
    },
    comeToFront: async (): Promise<void> => {
      await act(async () => {
        for (const listener of front) {
          listener('active');
        }
        await jest.advanceTimersByTimeAsync(0);
      });
    },
    goToBackground: async (): Promise<void> => {
      await act(async () => {
        for (const listener of front) {
          listener('background');
        }
        await jest.advanceTimersByTimeAsync(0);
      });
    },
  };
}

// Starts the app for a User who finished Onboarding, and waits until the main screen has its data. `kept` adds to
// what the phone keeps, such as an explanation answered earlier.
export async function openMain(
  kept: Partial<Kept> = {},
  more: Parameters<typeof startApp>[1] = {},
): Promise<ReturnType<typeof userEvent.setup>> {
  await keep({
    signedIn: true,
    consented: true,
    onboardingCompleted: true,
    suggestion: null,
    answers: {
      name: '홍길동',
      department: '컴퓨터공학부',
      admissionYear: 2022,
      hashtags: [],
      courseLevel: 'undergraduate',
      gender: null,
    },
    ...kept,
  });
  await startApp('/', more);
  // The loading screen first; the main screen asks for its data once it is shown.
  await pass(1000);
  await pass(500);
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

function isStyle(style: unknown): style is StyleProp<ViewStyle> {
  return typeof style === 'object' && style !== null;
}

// Where something is drawn on the plain ground, in points from the map's top left.
export function placeOf(name: string): { left: number; top: number } {
  const style: unknown = screen.getByLabelText(name).parent?.props.style;
  const { left, top } = StyleSheet.flatten<ViewStyle>(isStyle(style) ? style : {});
  return { left: Number(left), top: Number(top) };
}
