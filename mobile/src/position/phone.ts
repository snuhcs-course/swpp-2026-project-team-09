import * as Location from 'expo-location';
import type { LatLng } from '@/api/types';

// The phone's own position, through `expo-location`: this is the one file that names the library. On the web it is
// the browser's geolocation. Nothing here throws: where the phone or the browser has no answer, there is no
// permission and no position.

export type PhonePermission = 'unasked' | 'granted' | 'refused';

function permissionOf({ status }: { status: string }): PhonePermission {
  if (status === 'granted') {
    return 'granted';
  }
  return status === 'denied' ? 'refused' : 'unasked';
}

// What the phone says about the permission now, without asking the User.
export async function readPermission(): Promise<PhonePermission> {
  try {
    return permissionOf(await Location.getForegroundPermissionsAsync());
  } catch {
    // A browser that cannot say: the User is asked when they want their position.
    return 'unasked';
  }
}

// Shows the system's prompt. Where there is nothing to ask, the answer is a refusal.
export async function askPermission(): Promise<PhonePermission> {
  try {
    const asked = permissionOf(await Location.requestForegroundPermissionsAsync());
    return asked === 'granted' ? 'granted' : 'refused';
  } catch {
    return 'refused';
  }
}

const nothing = (): void => {
  // Nothing was started, so there is nothing to stop.
};

// Tells each new position, about every `everyMs`, until the function it answers is called.
export function watchPhone(everyMs: number, tell: (position: LatLng) => void): () => void {
  let stop = nothing;
  let stopped = false;
  const start = async (): Promise<void> => {
    try {
      const watch = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: everyMs, distanceInterval: 0 },
        ({ coords: { latitude, longitude } }) => {
          if (!stopped) {
            tell({ latitude, longitude });
          }
        },
      );
      stop = (): void => {
        watch.remove();
      };
      if (stopped) {
        stop();
      }
    } catch {
      // No position service: the map stays without the User's Avatar.
    }
  };
  void start();
  return (): void => {
    stopped = true;
    stop();
  };
}
