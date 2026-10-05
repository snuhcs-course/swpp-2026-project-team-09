import * as Location from 'expo-location';
import { Linking } from 'react-native';
import type { LatLng } from '@/api/types';

// The phone's own position, through `expo-location`: this is the one file that names the library. On the web it is
// the browser's geolocation. Nothing here throws: where the phone or the browser has no answer, there is no
// permission and no position.

// `refused`: the User said no and the system's prompt can be shown again. `blocked`: the system no longer prompts,
// so only the phone's settings can allow it.
export type PhonePermission = 'unasked' | 'granted' | 'refused' | 'blocked';

function permissionOf({ status, canAskAgain }: { status: string; canAskAgain: boolean }): PhonePermission {
  if (status === 'granted') {
    return 'granted';
  }
  if (status !== 'denied') {
    return 'unasked';
  }
  return canAskAgain ? 'refused' : 'blocked';
}

// What the phone says about the permission now, without asking the User. Null where it cannot say, as in a browser
// without the permissions interface.
export async function readPermission(): Promise<PhonePermission | null> {
  try {
    return permissionOf(await Location.getForegroundPermissionsAsync());
  } catch {
    return null;
  }
}

// Shows the system's prompt. Where there is nothing to ask, the answer is a refusal.
export async function askPermission(): Promise<PhonePermission> {
  try {
    const asked = permissionOf(await Location.requestForegroundPermissionsAsync());
    return asked === 'unasked' ? 'refused' : asked;
  } catch {
    return 'refused';
  }
}

// Opens the phone's settings of this app, where a User allows what the system no longer asks about.
export async function openLocationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // Nowhere to open, as in a browser: the map stays without the User's Avatar.
  }
}

const nothing = (): void => {
  // Nothing was started, so there is nothing to stop.
};

export interface PhoneWatcher {
  // Each new position.
  tell: (position: LatLng) => void;
  // The watch could not start, as with the phone's location services turned off. It tells nothing until a new one
  // is started.
  failed: () => void;
}

// Tells each new position, about every `everyMs`, until the function it answers is called. It starts with the last
// position the phone knows, where it knows one, so that the User need not wait for the first measurement.
export function watchPhone(everyMs: number, { tell, failed }: PhoneWatcher): () => void {
  let stop = nothing;
  let stopped = false;
  let told = false;
  const give = ({ coords: { latitude, longitude } }: Location.LocationObject): void => {
    if (!stopped) {
      told = true;
      tell({ latitude, longitude });
    }
  };
  const seed = async (): Promise<void> => {
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last !== null && !told) {
        give(last);
      }
    } catch {
      // No last position: the first measurement is the first position.
    }
  };
  const start = async (): Promise<void> => {
    try {
      const watch = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: everyMs, distanceInterval: 0 },
        give,
      );
      stop = (): void => {
        watch.remove();
      };
      if (stopped) {
        stop();
      }
    } catch {
      if (!stopped) {
        failed();
      }
    }
  };
  void seed();
  void start();
  return (): void => {
    stopped = true;
    stop();
  };
}
