import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { keep } from '@/storage/kept';
import { BACKGROUND_EVERY_MS } from './background-rules';
import { type PhonePermission, permissionOf } from './phone';

// The phone's part of the background sending: Android's foreground service of `expo-location`, which tells each
// position to the task of `background-task.ts`. It needs a development build. Nothing here throws.

export const BACKGROUND_TASK = 'snunow.background-position';

const NOTIFICATION = {
  notificationTitle: '친구에게 내 위치를 공유하고 있어요',
  notificationBody: '앱을 열어 내 정보에서 끌 수 있어요',
} as const;

// Only Android, outside Expo Go and the web.
export async function backgroundAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  try {
    return await Location.isBackgroundLocationAvailableAsync();
  } catch {
    return false;
  }
}

export async function readBackgroundPermission(): Promise<PhonePermission> {
  try {
    return permissionOf(await Location.getBackgroundPermissionsAsync());
  } catch {
    return 'refused';
  }
}

// The system's prompt, which on recent Android versions is the app's page of the phone's settings.
export async function askBackgroundPermission(): Promise<PhonePermission> {
  try {
    const asked = permissionOf(await Location.requestBackgroundPermissionsAsync());
    return asked === 'unasked' ? 'refused' : asked;
  } catch {
    return 'refused';
  }
}

async function started(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_TASK);
  } catch {
    return false;
  }
}

// Android lets an app start a foreground service only while it is in front. The service ends with the app when the
// User swipes it away.
export async function startBackground(): Promise<void> {
  try {
    if (!(await started())) {
      await Location.startLocationUpdatesAsync(BACKGROUND_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: BACKGROUND_EVERY_MS,
        distanceInterval: 0,
        pausesUpdatesAutomatically: false,
        foregroundService: { ...NOTIFICATION, killServiceOnDestroy: true },
      });
    }
    await keep({ backgroundRunning: true });
  } catch {
    // Without the service the app still sends while it is in front.
  }
}

// `forget` also forgets the User's choice, at sign-out and at the end of the Session.
export async function stopBackground(forget = false): Promise<void> {
  try {
    await keep(forget ? { backgroundRunning: false, backgroundChosen: false } : { backgroundRunning: false });
    if (await started()) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_TASK);
    }
  } catch {
    // Nothing was running.
  }
}
