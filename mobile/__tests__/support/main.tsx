import { act, userEvent } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import type { LatLng } from '@/api/types';
import { keep } from '@/storage/kept';
import { pass, screen, startApp } from './app';

// Where the `Main` frame draws the User, and a place in the city outside the campus rectangle.
export const ON_CAMPUS: LatLng = { latitude: 37.45905, longitude: 126.9512 };
export const NEAR_LIBRARY: LatLng = { latitude: 37.4598, longitude: 126.9521 };
export const OFF_CAMPUS: LatLng = { latitude: 37.5665, longitude: 126.978 };

export const ME = '내 위치';
export const EXPLANATION = '내 위치를 지도에 표시할까요?';

type Permission = 'unasked' | 'granted' | 'refused';

const STATUS = {
  unasked: Location.PermissionStatus.UNDETERMINED,
  granted: Location.PermissionStatus.GRANTED,
  refused: Location.PermissionStatus.DENIED,
} as const;

function answerOf(permission: Permission): Location.LocationPermissionResponse {
  return { status: STATUS[permission], granted: permission === 'granted', canAskAgain: true, expires: 'never' };
}

function fix({ latitude, longitude }: LatLng): Location.LocationObject {
  return {
    coords: { latitude, longitude, altitude: null, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null },
    timestamp: 0,
  };
}

export interface Phone {
  // The system's prompt was shown this many times.
  prompts: () => number;
  // The phone measures a new position.
  moveTo: (position: LatLng) => Promise<void>;
}

// A phone behind `expo-location`, which the test file mocks: what it says about the permission, what the User
// answers to the system's prompt, and where it is.
export function givePhone(given: { permission: Permission; prompt?: Permission; position?: LatLng }): Phone {
  const watchers = new Set<Location.LocationCallback>();
  jest.mocked(Location.getForegroundPermissionsAsync).mockReset();
  jest.mocked(Location.requestForegroundPermissionsAsync).mockReset();
  jest.mocked(Location.watchPositionAsync).mockReset();
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(answerOf(given.permission));
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(answerOf(given.prompt ?? 'refused'));
  jest.mocked(Location.watchPositionAsync).mockImplementation((_options, watcher) => {
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
  return {
    prompts: () => jest.mocked(Location.requestForegroundPermissionsAsync).mock.calls.length,
    moveTo: async (position): Promise<void> => {
      await act(() => {
        for (const watcher of watchers) {
          watcher(fix(position));
        }
      });
    },
  };
}

// Starts the app for a User who finished Onboarding, and waits until the main screen has its data.
export async function openMain(): Promise<ReturnType<typeof userEvent.setup>> {
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
  });
  await startApp();
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
  const style: unknown = screen.getByRole('button', { name }).parent?.props.style;
  const { left, top } = StyleSheet.flatten<ViewStyle>(isStyle(style) ? style : {});
  return { left: Number(left), top: Number(top) };
}
