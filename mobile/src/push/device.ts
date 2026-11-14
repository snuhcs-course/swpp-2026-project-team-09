/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import type * as ExpoNotifications from 'expo-notifications';

type Notifications = typeof ExpoNotifications;

// The one Android channel. The config plugin's default channel and the main server's `channelId` use the same id.
export const CHANNEL_ID = 'default';

export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

// Whether this build holds the notifications library's native part. The web and builds before 11/19 do not.
export function pushAvailable(): boolean {
  return requireOptionalNativeModule('ExpoPushTokenManager') !== null;
}

function isLibrary(loaded: unknown): loaded is Notifications {
  return typeof loaded === 'object' && loaded !== null && 'getExpoPushTokenAsync' in loaded;
}

// The library is loaded only behind `pushAvailable()`: importing it without its native part throws.
function notifications(): Notifications | null {
  if (!pushAvailable()) {
    return null;
  }
  try {
    const loaded: unknown = require('expo-notifications');
    return isLibrary(loaded) ? loaded : null;
  } catch {
    return null;
  }
}

function stopNothing(): void {
  // Nothing was subscribed.
}

// Android 13 shows no permission prompt before a channel exists.
async function createChannel(library: Notifications): Promise<void> {
  await library.setNotificationChannelAsync(CHANNEL_ID, {
    name: '알림',
    importance: library.AndroidImportance.HIGH,
  });
}

async function permissionOf(library: Notifications): Promise<PushPermission> {
  try {
    const { status } = await library.getPermissionsAsync();
    return status;
  } catch {
    return 'unavailable';
  }
}

export function pushPermission(): Promise<PushPermission> {
  const library = notifications();
  return library === null ? Promise.resolve('unavailable') : permissionOf(library);
}

export async function askPushPermission(): Promise<Exclude<PushPermission, 'undetermined'>> {
  const library = notifications();
  if (library === null) {
    return 'unavailable';
  }
  try {
    await createChannel(library);
    const { granted } = await library.requestPermissionsAsync();
    return granted ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

function projectId(): string | undefined {
  const eas: unknown = Constants.expoConfig?.extra?.eas;
  if (typeof eas === 'object' && eas !== null && 'projectId' in eas && typeof eas.projectId === 'string') {
    return eas.projectId;
  }
  return undefined;
}

export async function expoPushToken(): Promise<string | null> {
  const library = notifications();
  if (library === null || (await permissionOf(library)) !== 'granted') {
    return null;
  }
  try {
    await createChannel(library);
    const token = await library.getExpoPushTokenAsync({ projectId: projectId() });
    return token.data;
  } catch {
    return null;
  }
}

// The phone's token can change, after a restore for example. The listener then asks for the Expo push token again.
export function onPushTokenChange(listener: () => void): () => void {
  const library = notifications();
  if (library === null) {
    return stopNothing;
  }
  try {
    const subscription = library.addPushTokenListener(() => {
      listener();
    });
    return () => {
      subscription.remove();
    };
  } catch {
    return stopNothing;
  }
}

export async function unregisterPush(): Promise<void> {
  const library = notifications();
  if (library === null) {
    return;
  }
  try {
    await library.unregisterForNotificationsAsync();
  } catch {
    // The Session ends whatever the phone answered.
  }
}
